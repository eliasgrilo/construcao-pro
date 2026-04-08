-- ─────────────────────────────────────────────────────────────────────────────
-- Add UUID text defaults to legacy TEXT primary keys
--
-- The application and RPC layer treat these IDs as optional on insert.
-- Legacy tables created without defaults break atomic flows at runtime.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE almoxarifados ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE categorias ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE estoques ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE fornecedores ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE itens_nf ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE materiais ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE movimentacoes ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE notas_fiscais ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE obras ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE refresh_tokens ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE usuarios ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
