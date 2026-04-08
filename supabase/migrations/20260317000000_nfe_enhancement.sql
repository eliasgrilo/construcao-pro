-- NF-e enhancement: add supplier linkage and item-level fiscal data

-- 1. Add fornecedor_id and nome_emitente to notas_fiscais
ALTER TABLE notas_fiscais
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nome_emitente text;

-- 2. Add cprod and gtin to itens_nf
ALTER TABLE itens_nf
  ADD COLUMN IF NOT EXISTS cprod text,
  ADD COLUMN IF NOT EXISTS gtin text;
