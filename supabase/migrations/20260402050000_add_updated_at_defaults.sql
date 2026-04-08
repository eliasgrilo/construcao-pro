-- ─────────────────────────────────────────────────────────────────────────────
-- Add updated_at defaults to legacy tables
--
-- These tables enforce NOT NULL on updated_at but were created without
-- defaults. The app and RPC layer rely on the database stamping inserts.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE almoxarifados ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE categorias ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE estoques ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE fornecedores ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE materiais ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE notas_fiscais ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE obras ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE usuarios ALTER COLUMN updated_at SET DEFAULT now();
