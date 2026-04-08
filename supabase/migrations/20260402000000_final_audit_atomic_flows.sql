-- ─────────────────────────────────────────────────────────────────────────────
-- Final audit atomic flows
--
-- Adds server-side transactions for the remaining multi-step client flows:
--   - obra + default almoxarifado creation
--   - obra maintenance start (+ optional problems)
--   - usuario update + obra assignments
--   - estoque entry + financeiro debit/log
--   - NF-e deletion orchestration
-- ─────────────────────────────────────────────────────────────────────────────

-- ── create_obra_with_almoxarifado ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_obra_with_almoxarifado(
  p_nome                    TEXT,
  p_endereco                TEXT,
  p_status                  TEXT DEFAULT 'ATIVA',
  p_orcamento               NUMERIC DEFAULT 0,
  p_valor_terreno           NUMERIC DEFAULT 0,
  p_valor_burocracia        NUMERIC DEFAULT 0,
  p_valor_construcao        NUMERIC DEFAULT 0,
  p_data_inicio             DATE DEFAULT NULL,
  p_data_previsao_termino   DATE DEFAULT NULL,
  p_responsavel             TEXT DEFAULT NULL,
  p_cliente                 TEXT DEFAULT NULL,
  p_area_total              NUMERIC DEFAULT NULL,
  p_observacoes             TEXT DEFAULT NULL
)
RETURNS public.obras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obra public.obras%ROWTYPE;
BEGIN
  INSERT INTO obras (
    nome,
    endereco,
    status,
    orcamento,
    valor_terreno,
    valor_burocracia,
    valor_construcao,
    data_inicio,
    data_previsao_termino,
    responsavel,
    cliente,
    area_total,
    observacoes
  )
  VALUES (
    p_nome,
    p_endereco,
    p_status::public.status_obra,
    COALESCE(p_orcamento, 0),
    COALESCE(p_valor_terreno, 0),
    COALESCE(p_valor_burocracia, 0),
    COALESCE(p_valor_construcao, 0),
    p_data_inicio,
    p_data_previsao_termino,
    p_responsavel,
    p_cliente,
    p_area_total,
    p_observacoes
  )
  RETURNING * INTO v_obra;

  INSERT INTO almoxarifados (nome, obra_id)
  VALUES ('Almoxarifado Principal', v_obra.id);

  RETURN v_obra;
END;
$$;

-- ── start_obra_manutencao ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_obra_manutencao(
  p_obra_id           UUID,
  p_status_anterior   TEXT DEFAULT NULL,
  p_problemas         TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS public.obra_manutencao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status  TEXT;
  v_status_anterior TEXT;
  v_manutencao      public.obra_manutencao%ROWTYPE;
  v_problema        TEXT;
BEGIN
  SELECT status
  INTO v_current_status
  FROM obras
  WHERE id = p_obra_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obra % não encontrada', p_obra_id;
  END IF;

  v_status_anterior := COALESCE(
    NULLIF(p_status_anterior, 'MANUTENCAO'),
    NULLIF(v_current_status, 'MANUTENCAO'),
    'ATIVA'
  );

  UPDATE obra_manutencao
  SET
    status = 'concluido',
    data_conclusao = now(),
    updated_at = now()
  WHERE obra_id = p_obra_id
    AND status = 'ativo';

  INSERT INTO obra_manutencao (obra_id, status, status_anterior)
  VALUES (p_obra_id, 'ativo', v_status_anterior)
  RETURNING * INTO v_manutencao;

  IF array_length(p_problemas, 1) > 0 THEN
    FOREACH v_problema IN ARRAY p_problemas
    LOOP
      v_problema := btrim(COALESCE(v_problema, ''));
      IF v_problema <> '' THEN
        INSERT INTO obra_manutencao_item (manutencao_id, obra_id, descricao)
        VALUES (v_manutencao.id, p_obra_id, v_problema);
      END IF;
    END LOOP;
  END IF;

  UPDATE obras
  SET
    status = 'MANUTENCAO',
    updated_at = now()
  WHERE id = p_obra_id;

  RETURN v_manutencao;
END;
$$;

-- ── update_usuario_with_obras ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_usuario_with_obras(
  p_usuario_id UUID,
  p_nome       TEXT,
  p_role       TEXT,
  p_ativo      BOOLEAN,
  p_obra_ids   UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE usuarios
  SET
    nome = p_nome,
    role = p_role::public.role,
    ativo = p_ativo,
    updated_at = now()
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário % não encontrado', p_usuario_id;
  END IF;

  DELETE FROM usuario_obras WHERE usuario_id = p_usuario_id;

  IF array_length(p_obra_ids, 1) > 0 THEN
    INSERT INTO usuario_obras (usuario_id, obra_id)
    SELECT p_usuario_id, unnest(p_obra_ids);
  END IF;
END;
$$;

-- ── create_entrada_estoque_financeiro ───────────────────────────────────────
CREATE OR REPLACE FUNCTION create_entrada_estoque_financeiro(
  p_material_id        UUID,
  p_quantidade         NUMERIC,
  p_preco_unitario     NUMERIC,
  p_almoxarifado_id    UUID,
  p_conta_id           UUID,
  p_subconta           TEXT,
  p_motivo             TEXT,
  p_data               DATE DEFAULT CURRENT_DATE,
  p_fornecedor_id      UUID DEFAULT NULL,
  p_observacao         TEXT DEFAULT NULL,
  p_unidade            TEXT DEFAULT NULL,
  p_forma_pagamento    TEXT DEFAULT NULL,
  p_nf_id              UUID DEFAULT NULL
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
    p_material_id,
    p_quantidade,
    p_preco_unitario,
    p_almoxarifado_id,
    p_fornecedor_id,
    p_observacao,
    p_unidade,
    p_forma_pagamento,
    p_nf_id
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

-- ── delete_nota_fiscal_orchestrated ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_nota_fiscal_orchestrated(
  p_nf_id               UUID,
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
        NULL,
        0
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

GRANT EXECUTE ON FUNCTION create_obra_with_almoxarifado(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE, DATE, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION start_obra_manutencao(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_usuario_with_obras(UUID, TEXT, TEXT, BOOLEAN, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_entrada_estoque_financeiro(UUID, NUMERIC, NUMERIC, UUID, UUID, TEXT, TEXT, DATE, UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_nota_fiscal_orchestrated(UUID, BOOLEAN) TO authenticated;
