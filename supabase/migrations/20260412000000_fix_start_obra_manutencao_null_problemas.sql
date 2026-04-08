-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: start_obra_manutencao — UUID cast + NULL-safe p_problemas
--
-- Root cause: obras.id is UUID but p_obra_id was TEXT, causing
-- "operator does not exist: uuid = text" on every call.
-- Also makes p_problemas NULL-safe (NULL == no problems).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION start_obra_manutencao(
  p_obra_id           TEXT,
  p_status_anterior   TEXT    DEFAULT NULL,
  p_problemas         TEXT[]  DEFAULT NULL
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
  WHERE id = p_obra_id::uuid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Obra % não encontrada', p_obra_id;
  END IF;

  v_status_anterior := COALESCE(
    NULLIF(p_status_anterior, 'MANUTENCAO'),
    NULLIF(v_current_status,  'MANUTENCAO'),
    'ATIVA'
  );

  UPDATE obra_manutencao
  SET
    status         = 'concluido',
    data_conclusao = now(),
    updated_at     = now()
  WHERE obra_id = p_obra_id::uuid
    AND status   = 'ativo';

  INSERT INTO obra_manutencao (obra_id, status, status_anterior)
  VALUES (p_obra_id::uuid, 'ativo', v_status_anterior)
  RETURNING * INTO v_manutencao;

  IF p_problemas IS NOT NULL AND array_length(p_problemas, 1) > 0 THEN
    FOREACH v_problema IN ARRAY p_problemas
    LOOP
      v_problema := btrim(COALESCE(v_problema, ''));
      IF v_problema <> '' THEN
        INSERT INTO obra_manutencao_item (manutencao_id, obra_id, descricao)
        VALUES (v_manutencao.id, p_obra_id::uuid, v_problema);
      END IF;
    END LOOP;
  END IF;

  UPDATE obras
  SET
    status     = 'MANUTENCAO',
    updated_at = now()
  WHERE id = p_obra_id::uuid;

  RETURN v_manutencao;
END;
$$;

GRANT EXECUTE ON FUNCTION start_obra_manutencao(TEXT, TEXT, TEXT[]) TO authenticated;
