-- Fix: DELETE RLS policies were missing on notas_fiscais and itens_nf.
-- Postgres RLS: when RLS is enabled and no policy matches a command, access is DENIED by default.
-- The Supabase JS client does NOT surface an error for RLS-denied deletes — it silently
-- returns data=[] and error=null, making the operation appear successful on the client.
-- This caused the delete button to show a success toast while the row remained in the DB.

CREATE POLICY "notas_fiscais_delete"
  ON public.notas_fiscais
  FOR DELETE
  TO authenticated
  USING (is_almoxarife_or_above());

CREATE POLICY "itens_nf_delete"
  ON public.itens_nf
  FOR DELETE
  TO authenticated
  USING (is_almoxarife_or_above());
