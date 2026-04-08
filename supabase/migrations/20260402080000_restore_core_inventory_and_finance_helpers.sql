-- ─────────────────────────────────────────────────────────────────────────────
-- Restore core inventory and finance helper RPCs
--
-- Some environments were missing the helper functions that the web app and
-- the newer atomic RPCs depend on. This migration makes those contracts
-- explicit and idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

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
  UPDATE financeiro_contas
  SET
    valor_caixa = valor_caixa + p_delta_caixa,
    valor_aplicado = valor_aplicado + p_delta_aplicado,
    updated_at = now()
  WHERE id = p_conta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta financeira % não encontrada', p_conta_id;
  END IF;

  IF p_destino_conta_id IS NOT NULL AND p_delta_destino_caixa <> 0 THEN
    UPDATE financeiro_contas
    SET
      valor_caixa = valor_caixa + p_delta_destino_caixa,
      updated_at = now()
    WHERE id = p_destino_conta_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta destino % não encontrada', p_destino_conta_id;
    END IF;
  END IF;

  INSERT INTO financeiro_movimentacoes (
    conta_id,
    tipo,
    subconta,
    motivo,
    valor,
    data,
    transferencia_destino_id
  )
  VALUES (
    p_conta_id,
    p_tipo,
    p_subconta,
    p_motivo,
    p_valor,
    p_data,
    NULLIF(p_transferencia_destino_id, '')::UUID
  )
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

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
  UPDATE financeiro_contas
  SET
    valor_caixa = valor_caixa - p_delta_caixa,
    valor_aplicado = valor_aplicado - p_delta_aplicado,
    updated_at = now()
  WHERE id = p_conta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta financeira % não encontrada', p_conta_id;
  END IF;

  IF p_destino_conta_id IS NOT NULL AND p_delta_destino_caixa <> 0 THEN
    UPDATE financeiro_contas
    SET
      valor_caixa = valor_caixa - p_delta_destino_caixa,
      updated_at = now()
    WHERE id = p_destino_conta_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta destino % não encontrada', p_destino_conta_id;
    END IF;
  END IF;

  DELETE FROM financeiro_movimentacoes WHERE id = p_mov_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação % não encontrada', p_mov_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION criar_movimentacao_entrada(
  p_material_id       TEXT,
  p_almoxarifado_id   TEXT,
  p_preco_unitario    DOUBLE PRECISION,
  p_quantidade        DOUBLE PRECISION,
  p_fornecedor_id     TEXT DEFAULT NULL,
  p_observacao        TEXT DEFAULT NULL,
  p_unidade           TEXT DEFAULT NULL,
  p_forma_pagamento   TEXT DEFAULT NULL,
  p_nf_id             TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov_id TEXT;
  v_usuario_id TEXT := auth.uid()::TEXT;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado não encontrado para registrar entrada';
  END IF;

  INSERT INTO movimentacoes (
    tipo,
    material_id,
    quantidade,
    preco_unitario,
    almoxarifado_id,
    fornecedor_id,
    nf_id,
    usuario_id,
    observacao,
    unidade,
    forma_pagamento
  )
  VALUES (
    'ENTRADA',
    p_material_id,
    p_quantidade,
    p_preco_unitario,
    p_almoxarifado_id,
    p_fornecedor_id,
    p_nf_id,
    v_usuario_id,
    p_observacao,
    p_unidade,
    p_forma_pagamento
  )
  RETURNING id INTO v_mov_id;

  UPDATE estoques
  SET
    quantidade = quantidade + p_quantidade,
    updated_at = now()
  WHERE material_id = p_material_id
    AND almoxarifado_id = p_almoxarifado_id;

  IF NOT FOUND THEN
    INSERT INTO estoques (material_id, almoxarifado_id, quantidade)
    VALUES (p_material_id, p_almoxarifado_id, p_quantidade);
  END IF;

  RETURN json_build_object('id', v_mov_id);
END;
$$;

CREATE OR REPLACE FUNCTION criar_movimentacao_saida(
  p_material_id       TEXT,
  p_almoxarifado_id   TEXT,
  p_preco_unitario    DOUBLE PRECISION,
  p_quantidade        DOUBLE PRECISION,
  p_observacao        TEXT DEFAULT NULL,
  p_unidade           TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov_id TEXT;
  v_usuario_id TEXT := auth.uid()::TEXT;
  v_new_qty DOUBLE PRECISION;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado não encontrado para registrar saída';
  END IF;

  UPDATE estoques
  SET
    quantidade = quantidade - p_quantidade,
    updated_at = now()
  WHERE material_id = p_material_id
    AND almoxarifado_id = p_almoxarifado_id
    AND quantidade >= p_quantidade
  RETURNING quantidade INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para saída do material %', p_material_id;
  END IF;

  IF v_new_qty = 0 THEN
    DELETE FROM estoques
    WHERE material_id = p_material_id
      AND almoxarifado_id = p_almoxarifado_id;
  END IF;

  INSERT INTO movimentacoes (
    tipo,
    material_id,
    quantidade,
    preco_unitario,
    almoxarifado_id,
    usuario_id,
    observacao,
    unidade
  )
  VALUES (
    'SAIDA',
    p_material_id,
    p_quantidade,
    p_preco_unitario,
    p_almoxarifado_id,
    v_usuario_id,
    p_observacao,
    p_unidade
  )
  RETURNING id INTO v_mov_id;

  RETURN json_build_object('id', v_mov_id);
END;
$$;

CREATE OR REPLACE FUNCTION criar_movimentacao_transferencia(
  p_material_id              TEXT,
  p_almoxarifado_id          TEXT,
  p_almoxarifado_destino_id  TEXT,
  p_quantidade               DOUBLE PRECISION,
  p_observacao               TEXT DEFAULT NULL,
  p_unidade                  TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov_id TEXT;
  v_usuario_id TEXT := auth.uid()::TEXT;
  v_new_qty DOUBLE PRECISION;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado não encontrado para registrar transferência';
  END IF;

  UPDATE estoques
  SET
    quantidade = quantidade - p_quantidade,
    updated_at = now()
  WHERE material_id = p_material_id
    AND almoxarifado_id = p_almoxarifado_id
    AND quantidade >= p_quantidade
  RETURNING quantidade INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para transferência do material %', p_material_id;
  END IF;

  IF v_new_qty = 0 THEN
    DELETE FROM estoques
    WHERE material_id = p_material_id
      AND almoxarifado_id = p_almoxarifado_id;
  END IF;

  UPDATE estoques
  SET
    quantidade = quantidade + p_quantidade,
    updated_at = now()
  WHERE material_id = p_material_id
    AND almoxarifado_id = p_almoxarifado_destino_id;

  IF NOT FOUND THEN
    INSERT INTO estoques (material_id, almoxarifado_id, quantidade)
    VALUES (p_material_id, p_almoxarifado_destino_id, p_quantidade);
  END IF;

  INSERT INTO movimentacoes (
    tipo,
    material_id,
    quantidade,
    preco_unitario,
    almoxarifado_id,
    almoxarifado_destino_id,
    usuario_id,
    observacao,
    unidade,
    status_transferencia
  )
  VALUES (
    'TRANSFERENCIA',
    p_material_id,
    p_quantidade,
    NULL,
    p_almoxarifado_id,
    p_almoxarifado_destino_id,
    v_usuario_id,
    p_observacao,
    p_unidade,
    'APROVADA'
  )
  RETURNING id INTO v_mov_id;

  RETURN json_build_object('id', v_mov_id);
END;
$$;

GRANT EXECUTE ON FUNCTION register_financeiro_movement(UUID, TEXT, TEXT, TEXT, NUMERIC, DATE, NUMERIC, NUMERIC, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reverse_financeiro_movement(UUID, UUID, NUMERIC, NUMERIC, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION criar_movimentacao_entrada(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION criar_movimentacao_saida(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION criar_movimentacao_transferencia(TEXT, TEXT, TEXT, DOUBLE PRECISION, TEXT, TEXT) TO authenticated;
