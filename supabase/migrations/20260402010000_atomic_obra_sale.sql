-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic obra sale
--
-- Registers the full sale flow in a single transaction:
--   - marks the obra as sold
--   - registers immediate financeiro movements
--   - creates contas a receber for financed legs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_obra_sale(
  p_obra_id       UUID,
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
      NULLIF(v_movement->>'transferencia_destino_id', '')::UUID
    );
  END LOOP;

  FOR v_receivable IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_receivables, '[]'::JSONB))
  LOOP
    PERFORM create_conta_receber(
      COALESCE(v_receivable->>'descricao', 'Venda de obra'),
      NULLIF(v_receivable->>'cliente', ''),
      COALESCE(NULLIF(v_receivable->>'obra_id', '')::UUID, p_obra_id),
      NULLIF(v_receivable->>'observacoes', ''),
      COALESCE((v_receivable->>'valor_total')::NUMERIC, 0),
      COALESCE(v_receivable->'parcelas', '[]'::JSONB)
    );
  END LOOP;

  RETURN v_obra;
END;
$$;

GRANT EXECUTE ON FUNCTION register_obra_sale(UUID, NUMERIC, JSONB, JSONB) TO authenticated;
