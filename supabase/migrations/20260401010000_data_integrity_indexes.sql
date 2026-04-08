-- ─────────────────────────────────────────────────────────────────────────────
-- Data integrity constraints + missing performance indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CRITICAL: Prevent duplicate contas_pagar per NF-e ────────────────────────
-- A single NF-e should generate at most one conta a pagar.
-- A partial unique index (WHERE nf_id IS NOT NULL) is used instead of
-- ALTER TABLE ... ADD CONSTRAINT UNIQUE because:
--   1. PostgreSQL allows multiple NULLs in a UNIQUE column, but the partial
--      index makes the intent explicit and avoids surprises.
--   2. IF NOT EXISTS makes the migration idempotent (safe to re-run).
CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_pagar_nf_id_unique
  ON contas_pagar(nf_id)
  WHERE nf_id IS NOT NULL;

-- ── CRITICAL: valor_total must be positive ───────────────────────────────────
-- NOT VALID: enforce only on new INSERT/UPDATE rows, not on any existing rows
-- that may have been inserted with valor_total = 0 before this constraint.
-- After a successful migration and data cleanup, VALIDATE CONSTRAINT can be
-- run separately to extend coverage to existing rows.
ALTER TABLE contas_pagar
  ADD CONSTRAINT IF NOT EXISTS contas_pagar_valor_total_positive
  CHECK (valor_total > 0) NOT VALID;

ALTER TABLE contas_receber
  ADD CONSTRAINT IF NOT EXISTS contas_receber_valor_total_positive
  CHECK (valor_total > 0) NOT VALID;

-- ── HIGH: financeiro_movimentacoes.conta_id index ────────────────────────────
-- Every movement query filters by conta_id. Postgres does NOT auto-index FK
-- columns, so this scan is O(N) on the full table without this index.
CREATE INDEX IF NOT EXISTS idx_financeiro_movimentacoes_conta_id
  ON financeiro_movimentacoes(conta_id);

-- ── HIGH: contas_pagar_parcelas.conta_pagar_id index ────────────────────────
-- The join in useContasPagarParcelas (SELECT *, contas_pagar(*)) traverses
-- this FK on every render. Without an index it's a full parcelas scan.
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_conta_pagar_id
  ON contas_pagar_parcelas(conta_pagar_id);

-- ── MEDIUM: contas_receber_parcelas.conta_receber_id index ──────────────────
CREATE INDEX IF NOT EXISTS idx_contas_receber_parcelas_conta_receber_id
  ON contas_receber_parcelas(conta_receber_id);

-- ── MEDIUM: notas_fiscais.status index ───────────────────────────────────────
-- NF-e list page filters by status (PENDENTE, PROCESSADA, REJEITADA).
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status
  ON notas_fiscais(status);

-- ── MEDIUM: financeiro_movimentacoes.data index ──────────────────────────────
-- Cost-trend queries filter by created_at >= 6_months_ago. A date index
-- dramatically reduces the scan on large movimentacoes tables.
CREATE INDEX IF NOT EXISTS idx_financeiro_movimentacoes_data
  ON financeiro_movimentacoes(data DESC);
