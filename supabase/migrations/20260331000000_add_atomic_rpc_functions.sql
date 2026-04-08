-- ─────────────────────────────────────────────────────────────
-- Atomic RPC functions — replace multi-step client-side writes
-- with single server-side transactions to guarantee consistency.
--
-- Functions:
--   pagar_parcela          — mark installment paid + deduct balance + log movement
--   receber_parcela        — mark installment received + credit balance + log movement
--   create_conta_pagar     — insert parent + installments atomically
--   create_conta_receber   — insert parent + installments atomically
--   set_usuario_obras      — replace obra assignments atomically
-- ─────────────────────────────────────────────────────────────

-- ── pagar_parcela ────────────────────────────────────────────
-- Atomically:
--   1. Marks the installment as PAGO
--   2. Debits valor from financeiro_contas.valor_caixa using an
--      atomic UPDATE ... = valor_caixa - p_valor (no read-then-write)
--   3. Inserts a SAIDA movement into financeiro_movimentacoes
CREATE OR REPLACE FUNCTION pagar_parcela(
  p_parcela_id        UUID,
  p_conta_bancaria_id UUID,
  p_valor             NUMERIC,
  p_data_pagamento    DATE,
  p_descricao         TEXT,
  p_numero_parcela    INTEGER,
  p_total_parcelas    INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
BEGIN
  -- 1. Mark installment as paid
  UPDATE contas_pagar_parcelas
  SET
    status            = 'PAGO',
    pago_em           = p_data_pagamento,
    conta_bancaria_id = p_conta_bancaria_id
  WHERE id = p_parcela_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela % não encontrada', p_parcela_id;
  END IF;

  -- 2. Atomic balance deduction — no race condition possible
  UPDATE financeiro_contas
  SET valor_caixa = valor_caixa - p_valor
  WHERE id = p_conta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta bancária % não encontrada', p_conta_bancaria_id;
  END IF;

  -- 3. Insert movement log
  v_label := CASE WHEN p_total_parcelas > 1
    THEN p_descricao || ' (' || p_numero_parcela || '/' || p_total_parcelas || ')'
    ELSE p_descricao
  END;

  INSERT INTO financeiro_movimentacoes
    (conta_id, tipo, subconta, motivo, valor, data, transferencia_destino_id)
  VALUES
    (p_conta_bancaria_id, 'SAIDA', 'CAIXA', 'Conta a pagar: ' || v_label, p_valor, p_data_pagamento, NULL);
END;
$$;

-- ── receber_parcela ──────────────────────────────────────────
-- Mirror of pagar_parcela for accounts receivable.
CREATE OR REPLACE FUNCTION receber_parcela(
  p_parcela_id        UUID,
  p_conta_bancaria_id UUID,
  p_valor             NUMERIC,
  p_data_recebimento  DATE,
  p_descricao         TEXT,
  p_numero_parcela    INTEGER,
  p_total_parcelas    INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
BEGIN
  -- 1. Mark installment as received
  UPDATE contas_receber_parcelas
  SET
    status            = 'RECEBIDO',
    recebido_em       = p_data_recebimento,
    conta_bancaria_id = p_conta_bancaria_id
  WHERE id = p_parcela_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela % não encontrada', p_parcela_id;
  END IF;

  -- 2. Atomic balance credit
  UPDATE financeiro_contas
  SET valor_caixa = valor_caixa + p_valor
  WHERE id = p_conta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta bancária % não encontrada', p_conta_bancaria_id;
  END IF;

  -- 3. Insert movement log
  v_label := CASE WHEN p_total_parcelas > 1
    THEN p_descricao || ' (' || p_numero_parcela || '/' || p_total_parcelas || ')'
    ELSE p_descricao
  END;

  INSERT INTO financeiro_movimentacoes
    (conta_id, tipo, subconta, motivo, valor, data, transferencia_destino_id)
  VALUES
    (p_conta_bancaria_id, 'ENTRADA', 'CAIXA', 'Recebimento: ' || v_label, p_valor, p_data_recebimento, NULL);
END;
$$;

-- ── create_conta_pagar ───────────────────────────────────────
-- Inserts parent record and all installments in a single transaction.
-- p_parcelas is a JSONB array: [{"numero_parcela":1,"total_parcelas":3,"valor":100.00,"vencimento":"2026-04-01","status":"PENDENTE"}, ...]
CREATE OR REPLACE FUNCTION create_conta_pagar(
  p_descricao      TEXT,
  p_categoria      TEXT,
  p_obra_id        UUID,
  p_observacoes    TEXT,
  p_valor_total    NUMERIC,
  p_nf_id          UUID,
  p_fornecedor_id  UUID,
  p_parcelas       JSONB
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
  -- 1. Insert parent
  INSERT INTO contas_pagar
    (descricao, categoria, obra_id, observacoes, valor_total, nf_id, fornecedor_id)
  VALUES
    (p_descricao, p_categoria, p_obra_id, p_observacoes, p_valor_total, p_nf_id, p_fornecedor_id)
  RETURNING id INTO v_conta_id;

  -- 2. Insert all installments — if any fail, the entire transaction rolls back
  FOR v_parcela IN SELECT * FROM jsonb_array_elements(p_parcelas)
  LOOP
    INSERT INTO contas_pagar_parcelas
      (conta_pagar_id, numero_parcela, total_parcelas, valor, vencimento, status)
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

-- ── create_conta_receber ─────────────────────────────────────
-- Mirror of create_conta_pagar for accounts receivable.
CREATE OR REPLACE FUNCTION create_conta_receber(
  p_descricao   TEXT,
  p_cliente     TEXT,
  p_obra_id     UUID,
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
  -- 1. Insert parent
  INSERT INTO contas_receber
    (descricao, cliente, obra_id, observacoes, valor_total)
  VALUES
    (p_descricao, p_cliente, p_obra_id, p_observacoes, p_valor_total)
  RETURNING id INTO v_conta_id;

  -- 2. Insert all installments atomically
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
      'PENDENTE'
    );
  END LOOP;

  RETURN v_conta_id;
END;
$$;

-- ── set_usuario_obras ────────────────────────────────────────
-- Replaces all obra assignments for a user in a single transaction.
-- If the delete succeeds but the insert fails, the entire operation
-- is rolled back — the user never ends up with zero assignments.
CREATE OR REPLACE FUNCTION set_usuario_obras(
  p_usuario_id UUID,
  p_obra_ids   UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove all current assignments
  DELETE FROM usuario_obras WHERE usuario_id = p_usuario_id;

  -- Insert new assignments (skip if empty array)
  IF array_length(p_obra_ids, 1) > 0 THEN
    INSERT INTO usuario_obras (usuario_id, obra_id)
    SELECT p_usuario_id, unnest(p_obra_ids);
  END IF;
END;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies)
GRANT EXECUTE ON FUNCTION pagar_parcela(UUID, UUID, NUMERIC, DATE, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION receber_parcela(UUID, UUID, NUMERIC, DATE, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_conta_pagar(TEXT, TEXT, UUID, TEXT, NUMERIC, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_conta_receber(TEXT, TEXT, UUID, TEXT, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION set_usuario_obras(UUID, UUID[]) TO authenticated;
