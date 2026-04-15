-- ─────────────────────────────────────────────────────────────────────────────
-- Allow authenticated users to INSERT/SELECT/UPDATE financeiro_movimentacoes.
--
-- Problem: financeiro_movimentacoes had RLS enabled with only a RESTRICTIVE
-- DELETE policy (blocking deletes). No permissive policy existed for INSERT or
-- SELECT, causing useCreateFinanceiroMovimentacao to fail silently with RLS
-- denied after a conta is created (the "saldo inicial" step).
--
-- Also re-ensures financeiro_contas policy exists in case the 20260414
-- migration was not yet applied to this instance.
-- ─────────────────────────────────────────────────────────────────────────────

-- financeiro_contas — idempotent guard
DROP POLICY IF EXISTS "allow_all_authenticated" ON financeiro_contas;
CREATE POLICY "allow_all_authenticated" ON financeiro_contas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- financeiro_movimentacoes — INSERT / SELECT / UPDATE allowed; DELETE stays blocked
DROP POLICY IF EXISTS "allow_all_authenticated" ON financeiro_movimentacoes;
CREATE POLICY "allow_all_authenticated" ON financeiro_movimentacoes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
