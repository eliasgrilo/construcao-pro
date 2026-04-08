-- ─────────────────────────────────────────────────────────────────────────────
-- Soft-delete for fornecedores
--
-- Hard-deleting a supplier that has movement history makes reconciliation
-- impossible. An `ativo` flag lets the app hide the supplier from new entries
-- while preserving all historical data and audit trails.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Index: the fornecedores list always filters WHERE ativo = TRUE, making this
-- a high-value partial index.
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo
  ON fornecedores(ativo)
  WHERE ativo = TRUE;
