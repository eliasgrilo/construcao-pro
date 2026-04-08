-- ─────────────────────────────────────────────────────────────────────────────
-- Fix 1: delete_nota_fiscal_orchestrated — missing DELETE FROM itens_nf
--
-- itens_nf.nf_id has an ON DELETE RESTRICT foreign key. Without explicitly
-- deleting itens_nf rows first, the final DELETE FROM notas_fiscais raises a
-- FK violation and the entire transaction rolls back — making NF deletion
-- impossible regardless of the financeiro flag.
--
-- Fix 2: align contas_receber.obra_id to TEXT
--
-- obras.id is TEXT (gen_random_uuid()::text). The contas_receber table was
-- created with obra_id UUID, causing a type mismatch in the FK constraint and
-- in register_obra_sale when it calls create_conta_receber(p_obra_id::UUID).
-- Changing obra_id to TEXT and updating the helper signatures removes the cast
-- and lets the RPC succeed when venda is registered with installments.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Fix 2a: align contas_receber.obra_id column type ─────────────────────────

ALTER TABLE contas_receber
  ALTER COLUMN obra_id TYPE TEXT USING obra_id::TEXT;

-- ── Fix 2b: update create_conta_receber to accept TEXT p_obra_id ──────────────

DROP FUNCTION IF EXISTS create_conta_receber(TEXT, TEXT, UUID, TEXT, NUMERIC, JSONB);

CREATE OR REPLACE FUNCTION create_conta_receber(
  p_descricao   TEXT,
  p_cliente     TEXT,
  p_obra_id     TEXT,
  p_observacoes TEXT,
  p_valor_total NUMERIC,
  p_parcelas    JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta_id UUID;
  v_parcela  JSONB;
BEGIN
  INSERT INTO contas_receber
    (descricao, cliente, obra_id, observacoes, valor_total)
  VALUES
    (p_descricao, p_cliente, p_obra_id, p_observacoes, p_valor_total)
  RETURNING id INTO v_conta_id;

  FOR v_parcela IN SELECT * FROM jsonb_array_elements(p_parcelas)
  LOOP
    INSERT INTO contas_receber_parcelas
      (conta_receber_id, numero_parcela, total_parcelas, valor, vencimento, status)
    VALUES (
      v_conta_id,
      (v_parcela->>'numero_parcela')::INTEGER,
      (v_parcela->>'total_parcelas')::INTEGER,
      (v_parcela->>'valor')::NUMERIC,
      (v_parcela->>'vencimento')::DATE,
      COALESCE(v_parcela->>'status', 'PENDENTE')
    );
  END LOOP;

  RETURN v_conta_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_conta_receber(TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB) TO authenticated;

-- ── Fix 1 + 2c: rewrite delete_nota_fiscal_orchestrated and register_obra_sale ─

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

  -- Delete line items before the parent to satisfy the FK constraint on itens_nf.nf_id
  DELETE FROM itens_nf WHERE nf_id = p_nf_id;

  DELETE FROM notas_fiscais WHERE id = p_nf_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao remover a NF-e %', p_nf_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_nota_fiscal_orchestrated(TEXT, BOOLEAN) TO authenticated;

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
    -- obra_id is passed as TEXT (no ::UUID cast) to match the updated
    -- create_conta_receber signature and contas_receber.obra_id TEXT column.
    PERFORM create_conta_receber(
      COALESCE(v_receivable->>'descricao', 'Venda de obra'),
      NULLIF(v_receivable->>'cliente', ''),
      COALESCE(NULLIF(v_receivable->>'obra_id', ''), p_obra_id),
      NULLIF(v_receivable->>'observacoes', ''),
      COALESCE((v_receivable->>'valor_total')::NUMERIC, 0),
      COALESCE(v_receivable->'parcelas', '[]'::JSONB)
    );
  END LOOP;

  RETURN v_obra;
END;
$$;

GRANT EXECUTE ON FUNCTION register_obra_sale(TEXT, NUMERIC, JSONB, JSONB) TO authenticated;
