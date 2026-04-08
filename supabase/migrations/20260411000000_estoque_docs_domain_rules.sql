-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Estoque domain RPCs, movimentacoes audit, documentos versioning
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. saldo_estoque — consolidated balance per obra (never compute on frontend)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION saldo_estoque(p_obra_id text)
RETURNS TABLE (
  material_id text,
  nome        text,
  quantidade  numeric,
  unidade     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id::text      AS material_id,
    m.nome,
    SUM(
      CASE mv.tipo
        WHEN 'ENTRADA'     THEN  mv.quantidade
        WHEN 'SAIDA'       THEN -mv.quantidade
        WHEN 'TRANSFERENCIA' THEN
          CASE
            WHEN al_origem.obra_id = p_obra_id AND al_dest.obra_id <> p_obra_id THEN -mv.quantidade
            WHEN al_dest.obra_id   = p_obra_id AND al_origem.obra_id <> p_obra_id THEN mv.quantidade
            ELSE 0
          END
        ELSE 0
      END
    )               AS quantidade,
    COALESCE(mv.unidade, m.unidade::text, 'UN') AS unidade
  FROM movimentacoes mv
  JOIN materiais    m        ON m.id = mv.material_id
  JOIN almoxarifados al_origem ON al_origem.id = mv.almoxarifado_id
  LEFT JOIN almoxarifados al_dest  ON al_dest.id  = mv.almoxarifado_destino_id
  WHERE al_origem.obra_id = p_obra_id
     OR al_dest.obra_id   = p_obra_id
  GROUP BY m.id, m.nome, mv.unidade, m.unidade;
$$;

GRANT EXECUTE ON FUNCTION saldo_estoque(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. verificar_estoque_minimo — materials below minimum for a given obra
--    Called on initial load; subscribed via Realtime for live alerts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verificar_estoque_minimo(p_obra_id text)
RETURNS TABLE (
  material_id     text,
  nome            text,
  quantidade_atual numeric,
  estoque_minimo  numeric,
  unidade         text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.material_id,
    s.nome,
    s.quantidade        AS quantidade_atual,
    m.estoque_minimo,
    s.unidade
  FROM saldo_estoque(p_obra_id) s
  JOIN materiais m ON m.id::text = s.material_id
  WHERE m.estoque_minimo IS NOT NULL
    AND m.estoque_minimo > 0
    AND s.quantidade <= m.estoque_minimo;
$$;

GRANT EXECUTE ON FUNCTION verificar_estoque_minimo(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Block hard-DELETE on movimentacoes — only estorno (new negative row) allowed
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'movimentacoes'
      AND policyname = 'movimentacoes: proibir DELETE'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "movimentacoes: proibir DELETE"
        ON movimentacoes
        AS RESTRICTIVE
        FOR DELETE
        TO authenticated
        USING (false)
    $policy$;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Documentos — explicit versioning
--    versao_anterior_id links a new upload to the document it supersedes.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS versao_anterior_id text REFERENCES documentos(id);

CREATE INDEX IF NOT EXISTS documentos_versao_anterior_id_idx
  ON documentos(versao_anterior_id)
  WHERE versao_anterior_id IS NOT NULL;
