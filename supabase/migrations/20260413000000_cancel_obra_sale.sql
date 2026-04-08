-- ─────────────────────────────────────────────────────────────────────────────
-- Cancel obra sale
--
-- Reverses the full sale flow atomically when an obra is moved OUT of VENDIDO:
--   - restores financeiro_movimentacoes balances and removes the rows
--   - deletes contas_receber (and their parcelas via CASCADE) for the obra
--   - resets obras.valor_venda to NULL and updates status
--
-- Also stamps obra_id on movements created by register_obra_sale so they can
-- be identified for reversal.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add obra_id to financeiro_movimentacoes ────────────────────────────────
ALTER TABLE financeiro_movimentacoes
  ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES obras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_mov_obra_id ON financeiro_movimentacoes(obra_id);

-- ── 2. Update register_obra_sale to stamp obra_id on each movement ────────────
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
  v_mov_id       UUID;
BEGIN
  UPDATE obras
  SET
    status      = 'VENDIDO',
    valor_venda = COALESCE(p_valor_venda, 0),
    updated_at  = now()
  WHERE id = p_obra_id::UUID
  RETURNING * INTO v_obra;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obra % não encontrada', p_obra_id;
  END IF;

  FOR v_movement IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_movements, '[]'::JSONB))
  LOOP
    -- Capture UUID so we can stamp obra_id on the created movement
    v_mov_id := register_financeiro_movement(
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

    UPDATE financeiro_movimentacoes SET obra_id = p_obra_id::UUID WHERE id = v_mov_id;
  END LOOP;

  FOR v_receivable IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_receivables, '[]'::JSONB))
  LOOP
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

-- ── 3. cancel_obra_sale ───────────────────────────────────────────────────────
-- Reverses a registered obra sale atomically.
-- Raises if any contas_receber parcela is already RECEBIDO (money already received).
CREATE OR REPLACE FUNCTION cancel_obra_sale(
  p_obra_id    TEXT,
  p_new_status TEXT DEFAULT 'ATIVA'
)
RETURNS public.obras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obra           public.obras%ROWTYPE;
  v_mov            RECORD;
  v_delta_caixa    NUMERIC;
  v_delta_aplicado NUMERIC;
BEGIN
  -- Lock the obra row for the duration of the transaction
  SELECT * INTO v_obra FROM obras WHERE id = p_obra_id::UUID FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obra % não encontrada', p_obra_id;
  END IF;

  IF v_obra.status <> 'VENDIDO' THEN
    RAISE EXCEPTION 'A obra % não está com status VENDIDO (status atual: %)', p_obra_id, v_obra.status;
  END IF;

  -- Block if any installment has already been received
  IF EXISTS (
    SELECT 1
    FROM contas_receber cr
    JOIN contas_receber_parcelas crp ON crp.conta_receber_id = cr.id
    WHERE cr.obra_id = p_obra_id::UUID
      AND crp.status = 'RECEBIDO'
  ) THEN
    RAISE EXCEPTION 'Não é possível cancelar a venda: existem parcelas já recebidas para esta obra';
  END IF;

  -- Reverse all financeiro movements created by this obra's sale
  FOR v_mov IN
    SELECT id, conta_id, tipo, subconta, valor
    FROM financeiro_movimentacoes
    WHERE obra_id = p_obra_id::UUID
  LOOP
    IF v_mov.tipo NOT IN ('ENTRADA', 'SAIDA') THEN
      RAISE EXCEPTION 'Movimentação % tem tipo % que não pode ser revertido automaticamente', v_mov.id, v_mov.tipo;
    END IF;

    v_delta_caixa := CASE
      WHEN v_mov.tipo = 'ENTRADA' AND v_mov.subconta = 'CAIXA'    THEN  v_mov.valor
      WHEN v_mov.tipo = 'SAIDA'   AND v_mov.subconta = 'CAIXA'    THEN -v_mov.valor
      ELSE 0
    END;

    v_delta_aplicado := CASE
      WHEN v_mov.tipo = 'ENTRADA' AND v_mov.subconta = 'APLICADO' THEN  v_mov.valor
      WHEN v_mov.tipo = 'SAIDA'   AND v_mov.subconta = 'APLICADO' THEN -v_mov.valor
      ELSE 0
    END;

    PERFORM reverse_financeiro_movement(
      v_mov.id,
      v_mov.conta_id,
      v_delta_caixa,
      v_delta_aplicado,
      NULL::UUID,
      0::NUMERIC
    );
  END LOOP;

  -- Delete contas_receber for this obra (CASCADE removes parcelas)
  DELETE FROM contas_receber WHERE obra_id = p_obra_id::UUID;

  -- Reset obra: clear valor_venda, set new status
  UPDATE obras
  SET
    status      = p_new_status::status_obra,
    valor_venda = NULL,
    updated_at  = now()
  WHERE id = p_obra_id::UUID
  RETURNING * INTO v_obra;

  RETURN v_obra;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_obra_sale(TEXT, TEXT) TO authenticated;
