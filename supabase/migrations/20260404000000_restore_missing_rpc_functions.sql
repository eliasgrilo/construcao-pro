-- ─────────────────────────────────────────────────────────────────────────────
-- Restore missing RPCs: get_dashboard_stats, get_estoque_alertas,
-- get_fornecedor_category_map
--
-- These functions were absent from the database despite their migrations being
-- marked as applied. The original get_dashboard_stats called public.is_admin()
-- which was never defined; replaced with a direct role check on usuarios.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. get_dashboard_stats — admin check fixed: uses direct role lookup
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  TEXT    := auth.uid()::TEXT;
  v_is_admin BOOLEAN;
  v_result   JSON;
BEGIN
  SELECT (role = 'ADMIN') INTO v_is_admin
  FROM usuarios
  WHERE id = v_user_id;

  v_is_admin := COALESCE(v_is_admin, false);

  SELECT json_build_object(
    'obrasAtivas', (
      SELECT count(*) FROM obras o
      WHERE o.status = 'ATIVA'
        AND (v_is_admin OR EXISTS(
          SELECT 1 FROM usuario_obras uo
          WHERE uo.usuario_id = v_user_id AND uo.obra_id = o.id
        ))
    ),
    'totalObras', (
      SELECT count(*) FROM obras o
      WHERE v_is_admin OR EXISTS(
        SELECT 1 FROM usuario_obras uo
        WHERE uo.usuario_id = v_user_id AND uo.obra_id = o.id
      )
    ),
    'totalMateriais',     (SELECT count(*) FROM materiais),
    'totalMovimentacoes', (
      SELECT count(*) FROM movimentacoes m
      WHERE v_is_admin OR EXISTS(
        SELECT 1 FROM almoxarifados a
        JOIN usuario_obras uo ON uo.obra_id = a.obra_id
        WHERE a.id = m.almoxarifado_id AND uo.usuario_id = v_user_id
      )
    ),
    'totalNFs', (SELECT count(*) FROM notas_fiscais),
    'alertasEstoque', (
      SELECT count(*) FROM estoques e
      JOIN materiais mat ON mat.id = e.material_id
      WHERE mat.estoque_minimo > 0
        AND e.quantidade <= mat.estoque_minimo
        AND (v_is_admin OR EXISTS(
          SELECT 1 FROM almoxarifados a
          JOIN usuario_obras uo ON uo.obra_id = a.obra_id
          WHERE a.id = e.almoxarifado_id AND uo.usuario_id = v_user_id
        ))
    ),
    'custoTotal', COALESCE((
      SELECT sum(
        COALESCE(o.valor_terreno, 0)
        + COALESCE((
            SELECT sum(lb.valor)
            FROM obra_lancamentos_burocracia lb
            WHERE lb.obra_id = o.id
          ), 0)
        + COALESCE((
            SELECT sum(mov.quantidade * COALESCE(mov.preco_unitario, 0))
            FROM movimentacoes mov
            JOIN almoxarifados a ON a.id = mov.almoxarifado_id
            WHERE a.obra_id = o.id AND mov.tipo = 'ENTRADA'
          ), 0)
      )
      FROM obras o
      WHERE v_is_admin OR EXISTS(
        SELECT 1 FROM usuario_obras uo
        WHERE uo.usuario_id = v_user_id AND uo.obra_id = o.id
      )
    ), 0),
    'orcamentoTotal', COALESCE((
      SELECT sum(o.orcamento) FROM obras o
      WHERE v_is_admin OR EXISTS(
        SELECT 1 FROM usuario_obras uo
        WHERE uo.usuario_id = v_user_id AND uo.obra_id = o.id
      )
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;

-- 2. get_estoque_alertas — items at or below minimum stock level
CREATE OR REPLACE FUNCTION get_estoque_alertas()
RETURNS TABLE (
  id                TEXT,
  material_nome     TEXT,
  almoxarifado_nome TEXT,
  obra_nome         TEXT,
  quantidade        DOUBLE PRECISION,
  estoque_minimo    DOUBLE PRECISION
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    mat.nome AS material_nome,
    a.nome   AS almoxarifado_nome,
    o.nome   AS obra_nome,
    e.quantidade,
    mat.estoque_minimo
  FROM estoques e
  JOIN materiais     mat ON mat.id = e.material_id
  JOIN almoxarifados a   ON a.id   = e.almoxarifado_id
  JOIN obras         o   ON o.id   = a.obra_id
  WHERE mat.estoque_minimo > 0
    AND e.quantidade <= mat.estoque_minimo
  ORDER BY (e.quantidade / NULLIF(mat.estoque_minimo, 0)) ASC;
$$;

GRANT EXECUTE ON FUNCTION get_estoque_alertas() TO authenticated;

-- 3. get_fornecedor_category_map — DISTINCT supplier→category mapping
--    (TEXT ids to match actual schema; original migration used UUID incorrectly)
CREATE OR REPLACE FUNCTION get_fornecedor_category_map()
RETURNS TABLE (
  fornecedor_id  TEXT,
  categoria_id   TEXT,
  categoria_nome TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    m.fornecedor_id,
    c.id   AS categoria_id,
    c.nome AS categoria_nome
  FROM movimentacoes m
  JOIN materiais  mat ON mat.id = m.material_id
  JOIN categorias c   ON c.id  = mat.categoria_id
  WHERE m.fornecedor_id IS NOT NULL
    AND m.tipo = 'ENTRADA';
$$;

GRANT EXECUTE ON FUNCTION get_fornecedor_category_map() TO authenticated;

-- 4. aprovar_transferencia — advances status_transferencia workflow
--    PENDENTE → APROVADA_NIVEL_1 → APROVADA
--    Called by useAprovarTransferencia hook but was never migrated.
CREATE OR REPLACE FUNCTION aprovar_transferencia(p_movimentacao_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_next   TEXT;
BEGIN
  SELECT status_transferencia INTO v_status
  FROM movimentacoes
  WHERE id = p_movimentacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação % não encontrada', p_movimentacao_id;
  END IF;

  IF v_status = 'PENDENTE' THEN
    v_next := 'APROVADA_NIVEL_1';
  ELSIF v_status = 'APROVADA_NIVEL_1' THEN
    v_next := 'APROVADA';
  ELSE
    RAISE EXCEPTION 'Movimentação % não pode ser aprovada (status atual: %)',
      p_movimentacao_id, v_status;
  END IF;

  UPDATE movimentacoes
  SET status_transferencia = v_next,
      updated_at = now()
  WHERE id = p_movimentacao_id;

  RETURN json_build_object('id', p_movimentacao_id, 'status', v_next);
END;
$$;

GRANT EXECUTE ON FUNCTION aprovar_transferencia(TEXT) TO authenticated;
