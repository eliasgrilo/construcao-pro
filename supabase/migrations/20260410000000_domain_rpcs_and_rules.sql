-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Domain RPCs, Lookup Tables, and Financial Rules
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. buscar_fornecedor_por_cnpj — lookup supplier by raw CNPJ digits
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION buscar_fornecedor_por_cnpj(p_cnpj text)
RETURNS TABLE (
  id          text,
  nome        text,
  cnpj        text,
  nome_fantasia text,
  telefone    text,
  email       text,
  endereco    text,
  cidade      text,
  estado      text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id::text,
    nome,
    cnpj,
    nome_fantasia,
    telefone,
    email,
    endereco,
    cidade,
    estado
  FROM fornecedores
  WHERE regexp_replace(cnpj, '\D', '', 'g') = regexp_replace(p_cnpj, '\D', '', 'g')
    AND deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION buscar_fornecedor_por_cnpj(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. cfop_categoria_map — lookup table for NF-e expense auto-categorisation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cfop_categoria_map (
  cfop      integer PRIMARY KEY,
  categoria text    NOT NULL
);

INSERT INTO cfop_categoria_map (cfop, categoria) VALUES
  (1101, 'Custo de Mercadoria Vendida'),
  (1102, 'Custo de Mercadoria Vendida'),
  (2101, 'Custo de Mercadoria Vendida'),
  (2102, 'Custo de Mercadoria Vendida'),
  (5101, 'Custo de Mercadoria Vendida'),
  (5102, 'Custo de Mercadoria Vendida'),
  (6101, 'Custo de Mercadoria Vendida'),
  (6102, 'Custo de Mercadoria Vendida'),
  (1403, 'Custo de Mercadoria Vendida'),
  (2403, 'Custo de Mercadoria Vendida'),
  (1401, 'Materiais de Construção'),
  (2401, 'Materiais de Construção'),
  (1551, 'Investimento / Equipamentos'),
  (2551, 'Investimento / Equipamentos'),
  (1406, 'Investimento / Equipamentos'),
  (2406, 'Investimento / Equipamentos'),
  (1556, 'Despesas Operacionais'),
  (2556, 'Despesas Operacionais'),
  (1407, 'Despesas Operacionais'),
  (2407, 'Despesas Operacionais'),
  (5201, '__DEVOLUCAO__'),
  (5202, '__DEVOLUCAO__'),
  (6201, '__DEVOLUCAO__'),
  (6202, '__DEVOLUCAO__'),
  (1201, '__DEVOLUCAO__'),
  (1202, '__DEVOLUCAO__'),
  (2201, '__DEVOLUCAO__'),
  (2202, '__DEVOLUCAO__')
ON CONFLICT (cfop) DO UPDATE SET categoria = EXCLUDED.categoria;

ALTER TABLE cfop_categoria_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfop_categoria_map: leitura autenticada"
  ON cfop_categoria_map FOR SELECT TO authenticated USING (true);

-- RPC: categorize by CFOP (used during NF-e import)
CREATE OR REPLACE FUNCTION categorizar_por_cfop(p_cfop text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT categoria FROM cfop_categoria_map WHERE cfop = p_cfop::integer),
    'Fornecedores'
  );
$$;

GRANT EXECUTE ON FUNCTION categorizar_por_cfop(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. fluxo_caixa_projetado — weekly projected cash flow for an obra
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fluxo_caixa_projetado(
  p_obra_id   text,
  p_inicio    date,
  p_fim       date
)
RETURNS TABLE (
  semana    date,
  receitas  numeric,
  despesas  numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH semanas AS (
    SELECT generate_series(p_inicio, p_fim, '1 week'::interval)::date AS semana
  ),
  receitas_sem AS (
    SELECT
      (date_trunc('week', crp.vencimento::date))::date AS semana,
      SUM(crp.valor)                                    AS total
    FROM contas_receber_parcelas crp
    JOIN contas_receber cr ON cr.id = crp.conta_receber_id
    WHERE cr.obra_id = p_obra_id
      AND crp.vencimento::date BETWEEN p_inicio AND p_fim
      AND crp.status <> 'CANCELADO'
    GROUP BY 1
  ),
  despesas_sem AS (
    SELECT
      (date_trunc('week', cpp.vencimento::date))::date AS semana,
      SUM(cpp.valor)                                    AS total
    FROM contas_pagar_parcelas cpp
    JOIN contas_pagar cp ON cp.id = cpp.conta_pagar_id
    WHERE cp.obra_id = p_obra_id
      AND cpp.vencimento::date BETWEEN p_inicio AND p_fim
      AND cpp.status <> 'CANCELADO'
    GROUP BY 1
  )
  SELECT
    s.semana,
    COALESCE(r.total, 0) AS receitas,
    COALESCE(d.total, 0) AS despesas
  FROM semanas s
  LEFT JOIN receitas_sem r ON r.semana = s.semana
  LEFT JOIN despesas_sem d ON d.semana = s.semana
  ORDER BY s.semana;
$$;

GRANT EXECUTE ON FUNCTION fluxo_caixa_projetado(text, date, date) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. cancelado_em / cancelado_por — financial entries are never deleted
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE financeiro_movimentacoes
  ADD COLUMN IF NOT EXISTS cancelado_em  timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por text;

-- Block hard-DELETE for all roles; cancellation is the only allowed "deletion"
CREATE POLICY "financeiro_movimentacoes: proibir DELETE"
  ON financeiro_movimentacoes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- RPC: cancel a financeiro movement (soft-delete) and reverse balance
CREATE OR REPLACE FUNCTION cancelar_financeiro_movement(
  p_mov_id            text,
  p_conta_id          text,
  p_delta_caixa       numeric,
  p_delta_aplicado    numeric,
  p_destino_conta_id  text    DEFAULT NULL,
  p_delta_destino_caixa numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark movement as cancelled
  UPDATE financeiro_movimentacoes
  SET
    cancelado_em  = now(),
    cancelado_por = auth.uid()::text
  WHERE id = p_mov_id;

  -- Reverse balance on primary account
  UPDATE financeiro_contas
  SET
    valor_caixa    = valor_caixa    - p_delta_caixa,
    valor_aplicado = valor_aplicado - p_delta_aplicado,
    updated_at     = now()
  WHERE id = p_conta_id;

  -- Reverse balance on destination account (transfers)
  IF p_destino_conta_id IS NOT NULL THEN
    UPDATE financeiro_contas
    SET
      valor_caixa = valor_caixa - p_delta_destino_caixa,
      updated_at  = now()
    WHERE id = p_destino_conta_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cancelar_financeiro_movement(text, text, numeric, numeric, text, numeric) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. vincular_nfe_estoque_atomico — atomic stock entry from NF-e items
-- ─────────────────────────────────────────────────────────────────────────────
-- Input: JSON array of { material_id, almoxarifado_id, quantidade, preco_unitario, unidade }
-- All entries are created in a single transaction — partial state is impossible.
CREATE OR REPLACE FUNCTION vincular_nfe_estoque_atomico(
  p_nf_id        text,
  p_fornecedor_id text,
  p_numero_nf    text,
  p_itens        jsonb   -- array of {material_id, almoxarifado_id, quantidade, preco_unitario, unidade}
)
RETURNS integer  -- number of movements created
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item          jsonb;
  v_count         integer := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    PERFORM criar_movimentacao_entrada(
      p_material_id     := (v_item->>'material_id'),
      p_quantidade      := (v_item->>'quantidade')::numeric,
      p_preco_unitario  := (v_item->>'preco_unitario')::numeric,
      p_almoxarifado_id := (v_item->>'almoxarifado_id'),
      p_nf_id           := p_nf_id,
      p_observacao      := 'NF-e nº ' || p_numero_nf,
      p_unidade         := v_item->>'unidade',
      p_fornecedor_id   := p_fornecedor_id,
      p_forma_pagamento := NULL
    );
    v_count := v_count + 1;
  END LOOP;

  -- Mark NF as linked after all entries succeed
  UPDATE notas_fiscais SET status = 'VINCULADA' WHERE id = p_nf_id;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION vincular_nfe_estoque_atomico(text, text, text, jsonb) TO authenticated;
