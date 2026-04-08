-- ─────────────────────────────────────────────────────────────────────────────
-- NF-e missing indexes + produto_fornecedor NULL-safe constraint
-- ─────────────────────────────────────────────────────────────────────────────

-- itens_nf: nf_id is queried on every NF detail page open — must be indexed.
-- Postgres does NOT auto-index FK columns.
CREATE INDEX IF NOT EXISTS idx_itens_nf_nf_id       ON itens_nf(nf_id);
CREATE INDEX IF NOT EXISTS idx_itens_nf_material_id ON itens_nf(material_id) WHERE material_id IS NOT NULL;

-- contas_pagar.fornecedor_id: used in supplier-filtered CP views (no index was created in the
-- original migration that added the column).
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor_id ON contas_pagar(fornecedor_id)
  WHERE fornecedor_id IS NOT NULL;

-- produto_fornecedor: when a supplier is hard-deleted (ON DELETE SET NULL),
-- multiple rows can accumulate with the same material_id + fornecedor_id=NULL because
-- PostgreSQL treats NULL != NULL and the regular UNIQUE constraint does not block duplicates.
-- This partial index prevents that accumulation: only one row per material may exist without
-- a supplier.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pf_material_no_fornecedor
  ON produto_fornecedor(material_id)
  WHERE fornecedor_id IS NULL;
