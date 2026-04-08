-- ─────────────────────────────────────────────────────────────────────────────
-- Fornecedores: replace boolean ativo with deleted_at TIMESTAMPTZ
--
-- deleted_at records the exact moment the supplier was soft-deleted, enabling
-- audit trails and precise recovery windows. ativo=false rows are migrated.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Migrate existing soft-deleted rows: set deleted_at to now() for any
-- supplier that was already marked ativo=false before this migration.
UPDATE fornecedores
SET deleted_at = now()
WHERE ativo = FALSE
  AND deleted_at IS NULL;

-- Replace the ativo partial index with a deleted_at IS NULL partial index.
-- The query pattern is always "active suppliers only" (deleted_at IS NULL).
DROP INDEX IF EXISTS idx_fornecedores_ativo;

CREATE INDEX IF NOT EXISTS idx_fornecedores_deleted_at
  ON fornecedores(deleted_at)
  WHERE deleted_at IS NULL;
