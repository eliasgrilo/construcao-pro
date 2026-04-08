-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic financeiro movement registration + reversal
--
-- Replaces the non-atomic client-side pattern:
--   READ balance from cache → compute new value → UPDATE → INSERT movement
--
-- With a single server-side transaction that uses atomic deltas:
--   UPDATE financeiro_contas SET valor_caixa = valor_caixa + delta (no race)
--   INSERT financeiro_movimentacoes
--
-- Functions:
--   register_financeiro_movement  — create movement + update balance atomically
--   reverse_financeiro_movement   — delete movement + restore balance atomically
-- ─────────────────────────────────────────────────────────────────────────────

-- ── register_financeiro_movement ─────────────────────────────────────────────
-- Parameters:
--   p_delta_caixa             : signed balance change for source conta's caixa
--   p_delta_aplicado          : signed balance change for source conta's aplicado
--   p_destino_conta_id        : NULL for non-transfer; UUID for inter-account transfer
--   p_delta_destino_caixa     : balance credit applied to destination conta (always caixa)
--   p_transferencia_destino_id: 'SWITCH' | UUID-as-text | NULL — stored on the log row
--
-- Examples:
--   ENTRADA CAIXA        : delta_caixa=+v, delta_aplicado=0
--   SAIDA   APLICADO     : delta_caixa=0,  delta_aplicado=-v
--   SWITCH  CAIXA→APLIC  : delta_caixa=-v, delta_aplicado=+v
--   TRANSFER to other    : delta_caixa=-v, delta_aplicado=0,
--                          destino_conta_id=X, delta_destino_caixa=+v
CREATE OR REPLACE FUNCTION register_financeiro_movement(
  p_conta_id                  UUID,
  p_tipo                      TEXT,
  p_subconta                  TEXT,
  p_motivo                    TEXT,
  p_valor                     NUMERIC,
  p_data                      DATE,
  p_delta_caixa               NUMERIC,
  p_delta_aplicado            NUMERIC,
  p_destino_conta_id          UUID    DEFAULT NULL,
  p_delta_destino_caixa       NUMERIC DEFAULT 0,
  p_transferencia_destino_id  TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov_id UUID;
BEGIN
  -- 1. Atomic balance update on source account (no read-then-write)
  UPDATE financeiro_contas
  SET
    valor_caixa    = valor_caixa    + p_delta_caixa,
    valor_aplicado = valor_aplicado + p_delta_aplicado,
    updated_at     = now()
  WHERE id = p_conta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta financeira % não encontrada', p_conta_id;
  END IF;

  -- 2. Atomic balance update on destination account (inter-account transfers only)
  IF p_destino_conta_id IS NOT NULL AND p_delta_destino_caixa <> 0 THEN
    UPDATE financeiro_contas
    SET
      valor_caixa = valor_caixa + p_delta_destino_caixa,
      updated_at  = now()
    WHERE id = p_destino_conta_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta destino % não encontrada', p_destino_conta_id;
    END IF;
  END IF;

  -- 3. Insert movement log (rolls back with the updates above on any failure)
  INSERT INTO financeiro_movimentacoes
    (conta_id, tipo, subconta, motivo, valor, data, transferencia_destino_id)
  VALUES
    (p_conta_id, p_tipo, p_subconta, p_motivo, p_valor, p_data, p_transferencia_destino_id)
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

-- ── reverse_financeiro_movement ──────────────────────────────────────────────
-- Atomically reverses a movement: restores balance on both accounts and
-- deletes the movement log row in a single transaction.
-- The caller passes the SAME deltas used when registering; this function
-- negates them automatically.
CREATE OR REPLACE FUNCTION reverse_financeiro_movement(
  p_mov_id               UUID,
  p_conta_id             UUID,
  p_delta_caixa          NUMERIC,
  p_delta_aplicado       NUMERIC,
  p_destino_conta_id     UUID    DEFAULT NULL,
  p_delta_destino_caixa  NUMERIC DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Reverse source account balance (negate original delta)
  UPDATE financeiro_contas
  SET
    valor_caixa    = valor_caixa    - p_delta_caixa,
    valor_aplicado = valor_aplicado - p_delta_aplicado,
    updated_at     = now()
  WHERE id = p_conta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta financeira % não encontrada', p_conta_id;
  END IF;

  -- 2. Reverse destination account balance (inter-account transfers)
  IF p_destino_conta_id IS NOT NULL AND p_delta_destino_caixa <> 0 THEN
    UPDATE financeiro_contas
    SET
      valor_caixa = valor_caixa - p_delta_destino_caixa,
      updated_at  = now()
    WHERE id = p_destino_conta_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta destino % não encontrada', p_destino_conta_id;
    END IF;
  END IF;

  -- 3. Delete the movement log (all or nothing with the balance updates above)
  DELETE FROM financeiro_movimentacoes WHERE id = p_mov_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação % não encontrada', p_mov_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION register_financeiro_movement(UUID, TEXT, TEXT, TEXT, NUMERIC, DATE, NUMERIC, NUMERIC, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reverse_financeiro_movement(UUID, UUID, NUMERIC, NUMERIC, UUID, NUMERIC) TO authenticated;
