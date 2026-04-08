-- ─────────────────────────────────────────────────────────────────────────────
-- Align legacy enum names/values with the atomic RPC contract
--
-- This project still uses quoted legacy enum names in the remote schema
-- ("StatusObra", "Role"), while newer RPCs were authored against the
-- generated snake_case aliases. The app also expects VENDIDO and TERRENO
-- to be valid obra statuses. This migration bridges that gap.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER TYPE "StatusObra" ADD VALUE IF NOT EXISTS 'VENDIDO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "StatusObra" ADD VALUE IF NOT EXISTS 'TERRENO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
    p_status::public."StatusObra",
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
    role = p_role::public."Role",
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

GRANT EXECUTE ON FUNCTION create_obra_with_almoxarifado(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE, DATE, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_usuario_with_obras(UUID, TEXT, TEXT, BOOLEAN, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION register_obra_sale(UUID, NUMERIC, JSONB, JSONB) TO authenticated;
