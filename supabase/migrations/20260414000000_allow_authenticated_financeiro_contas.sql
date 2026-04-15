-- ─────────────────────────────────────────────────────────────────────────────
-- Allow authenticated users to access financeiro_contas.
--
-- Problem: financeiro_contas had RLS enabled but no policy for the
-- `authenticated` role, causing all INSERT/SELECT operations to silently fail
-- with "Erro ao criar conta bancária".
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "allow_all_authenticated" ON financeiro_contas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
