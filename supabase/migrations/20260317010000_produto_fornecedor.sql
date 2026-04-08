-- produto_fornecedor: junction table linking one internal material to multiple supplier codes.
-- Problem: the same Coca-Cola 2L can be supplied by 3 different vendors, each with their own
-- <cProd> code in their XML. Without this table, re-importing from a new vendor would not
-- recognise the existing material and would create a duplicate entry.
-- Solution: store (material_id, fornecedor_id, cprod, gtin) so any future NF-e from the same
-- supplier with the same barcode or internal code goes straight to the right material.

CREATE TABLE IF NOT EXISTS produto_fornecedor (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id   uuid        NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
  fornecedor_id uuid        REFERENCES fornecedores(id) ON DELETE SET NULL,
  cprod         text,       -- supplier internal product code from <cProd>
  gtin          text,       -- barcode / EAN from <cEAN> / <cEANTrib>
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pf_material_fornecedor UNIQUE (material_id, fornecedor_id)
);

-- UNIQUE GTIN index — each barcode maps to exactly one internal material.
-- Also enables upsert ON CONFLICT(gtin) without the NULL-key problem that
-- would occur if we tried to use (material_id, fornecedor_id) with NULL values.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pf_gtin_unique
  ON produto_fornecedor(gtin)
  WHERE gtin IS NOT NULL;

-- Non-unique GTIN index for lookups that don't need the unique constraint
CREATE INDEX IF NOT EXISTS idx_pf_gtin
  ON produto_fornecedor(gtin)
  WHERE gtin IS NOT NULL;

-- Fast lookup by supplier + their internal code
CREATE INDEX IF NOT EXISTS idx_pf_fornecedor_cprod
  ON produto_fornecedor(fornecedor_id, cprod)
  WHERE cprod IS NOT NULL;

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION update_produto_fornecedor_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pf_updated_at ON produto_fornecedor;
CREATE TRIGGER trg_pf_updated_at
  BEFORE UPDATE ON produto_fornecedor
  FOR EACH ROW EXECUTE FUNCTION update_produto_fornecedor_updated_at();

-- RLS: inherit access from materiais so users only see their own mappings
ALTER TABLE produto_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_select" ON produto_fornecedor
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );

CREATE POLICY "pf_insert" ON produto_fornecedor
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );

CREATE POLICY "pf_update" ON produto_fornecedor
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );

CREATE POLICY "pf_delete" ON produto_fornecedor
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );
