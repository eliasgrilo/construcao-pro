-- ─────────────────────────────────────────────────────────────────────────────
-- NF-e Fine Tuning — missing fiscal columns across all NF-e tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Based on Brazilian NF-e spec requirements:
--   • fornecedores  — IE (Inscrição Estadual) + nome_fantasia as proper columns
--   • materiais     — CEST code for ICMS-ST products + soft-delete ativo flag
--   • notas_fiscais — finNFe (finalidade) + xml_original for 5-year legal backup
--   • itens_nf      — per-item tax breakdown (IPI, ICMS-ST) + cost apportionment
--   • produto_fornecedor — unidade_compra + fator_conversao for CX→UN conversion
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. fornecedores ─────────────────────────────────────────────────────────────
-- inscricao_estadual: required to generate return-merchandise notes and fiscal reports
-- nome_fantasia: separate column instead of being buried in observacao text
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia      TEXT;

-- 2. materiais ────────────────────────────────────────────────────────────────
-- cest_padrao: mandatory for ICMS-ST products (Convênio ICMS 92/2015)
-- ativo: soft-delete flag — never hard-delete a material that has stock history
ALTER TABLE materiais
  ADD COLUMN IF NOT EXISTS cest_padrao TEXT,
  ADD COLUMN IF NOT EXISTS ativo       BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_materiais_ativo ON materiais(ativo) WHERE ativo = TRUE;

-- 3. notas_fiscais ────────────────────────────────────────────────────────────
-- finalidade: <finNFe> tag — 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
--   Used to prevent blind stock/financial entries for non-purchase notes.
-- xml_original: raw XML text — Brazilian law requires 5-year fiscal archive.
--   Also enables reprocessing if tax-parsing logic is later corrected.
ALTER TABLE notas_fiscais
  ADD COLUMN IF NOT EXISTS finalidade   SMALLINT,
  ADD COLUMN IF NOT EXISTS xml_original TEXT;

-- 4. itens_nf ─────────────────────────────────────────────────────────────────
-- rateio_frete/desconto: proportional freight/discount apportionment per item
--   Needed to calculate the real landed cost of each product.
-- valor_ipi: IPI tax amount (<vIPI>) charged on top of product price
-- valor_icms_st: ICMS Substituição Tributária (<vICMSST>) — the most common
--   "invisible cost" that causes incorrect margin calculations if ignored.
ALTER TABLE itens_nf
  ADD COLUMN IF NOT EXISTS rateio_frete    NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rateio_desconto NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ipi       NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_icms_st   NUMERIC NOT NULL DEFAULT 0;

-- 5. produto_fornecedor ───────────────────────────────────────────────────────
-- unidade_compra: purchase unit from <uCom> (e.g. CX, PCT, KG)
-- fator_conversao: multiplier to convert purchase unit → sale unit
--   Example: if uCom=CX with 12 units inside and unidade_venda=UN, fator=12.
--   When XML says qCom=2, stock increases by 2 * 12 = 24 units.
ALTER TABLE produto_fornecedor
  ADD COLUMN IF NOT EXISTS unidade_compra  TEXT,
  ADD COLUMN IF NOT EXISTS fator_conversao NUMERIC NOT NULL DEFAULT 1;
