-- Auto-update updated_at on every modification for core tables.
-- set_updated_at() is already defined in an earlier migration (20260301000000).
-- This migration adds BEFORE UPDATE triggers to tables that were missing them.

-- Helper macro: create trigger if not exists
-- (Supabase/PostgreSQL doesn't have CREATE TRIGGER IF NOT EXISTS, so we use DROP + CREATE)

-- ── Core catalog tables ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS obras_updated_at ON obras;
CREATE TRIGGER obras_updated_at
  BEFORE UPDATE ON obras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS almoxarifados_updated_at ON almoxarifados;
CREATE TRIGGER almoxarifados_updated_at
  BEFORE UPDATE ON almoxarifados
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS categorias_updated_at ON categorias;
CREATE TRIGGER categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS materiais_updated_at ON materiais;
CREATE TRIGGER materiais_updated_at
  BEFORE UPDATE ON materiais
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS estoques_updated_at ON estoques;
CREATE TRIGGER estoques_updated_at
  BEFORE UPDATE ON estoques
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS movimentacoes_updated_at ON movimentacoes;
CREATE TRIGGER movimentacoes_updated_at
  BEFORE UPDATE ON movimentacoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS fornecedores_updated_at ON fornecedores;
CREATE TRIGGER fornecedores_updated_at
  BEFORE UPDATE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Financial tables ───────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS financeiro_contas_updated_at ON financeiro_contas;
CREATE TRIGGER financeiro_contas_updated_at
  BEFORE UPDATE ON financeiro_contas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS financeiro_movimentacoes_updated_at ON financeiro_movimentacoes;
CREATE TRIGGER financeiro_movimentacoes_updated_at
  BEFORE UPDATE ON financeiro_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contas_pagar_updated_at ON contas_pagar;
CREATE TRIGGER contas_pagar_updated_at
  BEFORE UPDATE ON contas_pagar
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contas_pagar_parcelas_updated_at ON contas_pagar_parcelas;
CREATE TRIGGER contas_pagar_parcelas_updated_at
  BEFORE UPDATE ON contas_pagar_parcelas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contas_receber_updated_at ON contas_receber;
CREATE TRIGGER contas_receber_updated_at
  BEFORE UPDATE ON contas_receber
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contas_receber_parcelas_updated_at ON contas_receber_parcelas;
CREATE TRIGGER contas_receber_parcelas_updated_at
  BEFORE UPDATE ON contas_receber_parcelas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Document & invoice tables ──────────────────────────────────────────────────

DROP TRIGGER IF EXISTS notas_fiscais_updated_at ON notas_fiscais;
CREATE TRIGGER notas_fiscais_updated_at
  BEFORE UPDATE ON notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS itens_nf_updated_at ON itens_nf;
CREATE TRIGGER itens_nf_updated_at
  BEFORE UPDATE ON itens_nf
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS documentos_updated_at ON documentos;
CREATE TRIGGER documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Users ─────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS usuarios_updated_at ON usuarios;
CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
