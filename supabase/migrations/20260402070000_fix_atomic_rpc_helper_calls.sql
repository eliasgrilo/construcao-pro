-- ─────────────────────────────────────────────────────────────────────────────
-- Fix helper function calls inside atomic RPCs
--
-- Align nested calls with the real helper signatures:
--   - criar_movimentacao_entrada uses named TEXT args and double precision values
--   - reverse_financeiro_movement needs explicit UUID/NUMERIC nullables
--   - register_financeiro_movement stores transferencia_destino_id as TEXT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_entrada_estoque_financeiro(
  p_material_id        TEXT,
  p_quantidade         NUMERIC,
  p_preco_unitario     NUMERIC,
  p_almoxarifado_id    TEXT,
  p_conta_id           UUID,
  p_subconta           TEXT,
  p_motivo             TEXT,
  p_data               DATE DEFAULT CURRENT_DATE,
  p_fornecedor_id      TEXT DEFAULT NULL,
  p_observacao         TEXT DEFAULT NULL,
  p_unidade            TEXT DEFAULT NULL,
  p_forma_pagamento    TEXT DEFAULT NULL,
  p_nf_id              TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
  v_mov_id UUID;
BEGIN
  v_total := COALESCE(p_quantidade, 0) * COALESCE(p_preco_unitario, 0);

  PERFORM criar_movimentacao_entrada(
    p_almoxarifado_id => p_almoxarifado_id,
    p_forma_pagamento => p_forma_pagamento,
    p_fornecedor_id => p_fornecedor_id,
    p_material_id => p_material_id,
    p_nf_id => p_nf_id,
    p_observacao => p_observacao,
    p_preco_unitario => p_preco_unitario::DOUBLE PRECISION,
    p_quantidade => p_quantidade::DOUBLE PRECISION,
    p_unidade => p_unidade
  );

  v_mov_id := register_financeiro_movement(
    p_conta_id,
    'SAIDA',
    p_subconta,
    p_motivo,
    v_total,
    p_data,
    CASE WHEN p_subconta = 'CAIXA' THEN -v_total ELSE 0 END,
    CASE WHEN p_subconta = 'APLICADO' THEN -v_total ELSE 0 END,
    NULL,
    0,
    NULL
  );

  RETURN v_mov_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_nota_fiscal_orchestrated(
  p_nf_id               TEXT,
  p_cancel_financeiro   BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nf              public.notas_fiscais%ROWTYPE;
  v_mov             RECORD;
  v_fin_mov         RECORD;
  v_new_qty         NUMERIC;
  v_delta_caixa     NUMERIC;
  v_delta_aplicado  NUMERIC;
BEGIN
  SELECT *
  INTO v_nf
  FROM notas_fiscais
  WHERE id = p_nf_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NF-e % não encontrada', p_nf_id;
  END IF;

  IF p_cancel_financeiro THEN
    FOR v_mov IN
      SELECT id, tipo, material_id, almoxarifado_id, quantidade
      FROM movimentacoes
      WHERE nf_id = p_nf_id
      ORDER BY created_at DESC
    LOOP
      IF v_mov.tipo <> 'ENTRADA' THEN
        RAISE EXCEPTION 'Movimentação % vinculada à NF-e % não pode ser revertida automaticamente', v_mov.id, p_nf_id;
      END IF;

      UPDATE estoques
      SET
        quantidade = quantidade - v_mov.quantidade,
        updated_at = now()
      WHERE almoxarifado_id = v_mov.almoxarifado_id
        AND material_id = v_mov.material_id
        AND quantidade >= v_mov.quantidade
      RETURNING quantidade INTO v_new_qty;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Não é possível remover a NF-e % porque o estoque vinculado já foi consumido', p_nf_id;
      END IF;

      IF v_new_qty = 0 THEN
        DELETE FROM estoques
        WHERE almoxarifado_id = v_mov.almoxarifado_id
          AND material_id = v_mov.material_id;
      END IF;
    END LOOP;

    DELETE FROM movimentacoes WHERE nf_id = p_nf_id;

    FOR v_fin_mov IN
      SELECT id, conta_id, valor, tipo, subconta
      FROM financeiro_movimentacoes
      WHERE motivo LIKE ('NF-e nº ' || v_nf.numero || ' —%')
    LOOP
      v_delta_caixa := CASE
        WHEN v_fin_mov.tipo = 'ENTRADA' AND v_fin_mov.subconta = 'CAIXA' THEN v_fin_mov.valor
        WHEN v_fin_mov.tipo = 'SAIDA' AND v_fin_mov.subconta = 'CAIXA' THEN -v_fin_mov.valor
        ELSE 0
      END;

      v_delta_aplicado := CASE
        WHEN v_fin_mov.tipo = 'ENTRADA' AND v_fin_mov.subconta = 'APLICADO' THEN v_fin_mov.valor
        WHEN v_fin_mov.tipo = 'SAIDA' AND v_fin_mov.subconta = 'APLICADO' THEN -v_fin_mov.valor
        ELSE 0
      END;

      IF v_fin_mov.tipo NOT IN ('ENTRADA', 'SAIDA') THEN
        RAISE EXCEPTION 'Movimentação financeira % vinculada à NF-e % não pode ser revertida automaticamente', v_fin_mov.id, p_nf_id;
      END IF;

      PERFORM reverse_financeiro_movement(
        v_fin_mov.id,
        v_fin_mov.conta_id,
        v_delta_caixa,
        v_delta_aplicado,
        NULL::UUID,
        0::NUMERIC
      );
    END LOOP;

    DELETE FROM contas_pagar WHERE nf_id = p_nf_id;
  ELSE
    UPDATE contas_pagar
    SET nf_id = NULL
    WHERE nf_id = p_nf_id;

    UPDATE movimentacoes
    SET nf_id = NULL
    WHERE nf_id = p_nf_id;
  END IF;

  DELETE FROM notas_fiscais WHERE id = p_nf_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao remover a NF-e %', p_nf_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION register_obra_sale(
  p_obra_id       TEXT,
  p_valor_venda   NUMERIC,
  p_movements     JSONB DEFAULT '[]'::JSONB,
  p_receivables   JSONB DEFAULT '[]'::JSONB
)
RETURNS public.obras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obra         public.obras%ROWTYPE;
  v_movement     JSONB;
  v_receivable   JSONB;
BEGIN
  UPDATE obras
  SET
    status = 'VENDIDO',
    valor_venda = COALESCE(p_valor_venda, 0),
    updated_at = now()
  WHERE id = p_obra_id
  RETURNING * INTO v_obra;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obra % não encontrada', p_obra_id;
  END IF;

  FOR v_movement IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_movements, '[]'::JSONB))
  LOOP
    PERFORM register_financeiro_movement(
      (v_movement->>'conta_id')::UUID,
      (v_movement->>'tipo')::TEXT,
      (v_movement->>'subconta')::TEXT,
      COALESCE(v_movement->>'motivo', 'Venda de obra'),
      COALESCE((v_movement->>'valor')::NUMERIC, 0),
      COALESCE((v_movement->>'data')::DATE, CURRENT_DATE),
      COALESCE((v_movement->>'delta_caixa')::NUMERIC, 0),
      COALESCE((v_movement->>'delta_aplicado')::NUMERIC, 0),
      NULLIF(v_movement->>'destino_conta_id', '')::UUID,
      COALESCE((v_movement->>'delta_destino_caixa')::NUMERIC, 0),
      NULLIF(v_movement->>'transferencia_destino_id', '')::TEXT
    );
  END LOOP;

  FOR v_receivable IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_receivables, '[]'::JSONB))
  LOOP
    PERFORM create_conta_receber(
      COALESCE(v_receivable->>'descricao', 'Venda de obra'),
      NULLIF(v_receivable->>'cliente', ''),
      COALESCE(NULLIF(v_receivable->>'obra_id', '')::UUID, p_obra_id::UUID),
      NULLIF(v_receivable->>'observacoes', ''),
      COALESCE((v_receivable->>'valor_total')::NUMERIC, 0),
      COALESCE(v_receivable->'parcelas', '[]'::JSONB)
    );
  END LOOP;

  RETURN v_obra;
END;
$$;
