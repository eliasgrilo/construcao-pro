-- Cloud memory for NF-e AI item matching.
-- Stores confirmed XML description → internal material mappings so that
-- subsequent imports auto-confirm the same item without calling Gemini.
-- Shared across all authenticated users in the organisation (org-wide learning).

CREATE TABLE public.nf_match_memoria (
  descricao_xml   TEXT      NOT NULL PRIMARY KEY,
  material_id     UUID      NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  material_nome   TEXT      NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nf_match_memoria ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (shared organisational knowledge)
CREATE POLICY "nf_match_memoria_select"
  ON public.nf_match_memoria FOR SELECT TO authenticated
  USING (true);

-- Only almoxarifes and above can write / update / delete
CREATE POLICY "nf_match_memoria_insert"
  ON public.nf_match_memoria FOR INSERT TO authenticated
  WITH CHECK (is_almoxarife_or_above());

CREATE POLICY "nf_match_memoria_update"
  ON public.nf_match_memoria FOR UPDATE TO authenticated
  USING (is_almoxarife_or_above()) WITH CHECK (is_almoxarife_or_above());

CREATE POLICY "nf_match_memoria_delete"
  ON public.nf_match_memoria FOR DELETE TO authenticated
  USING (is_almoxarife_or_above());
