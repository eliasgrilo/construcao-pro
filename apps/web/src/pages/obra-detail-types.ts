import { Banknote, FileText, Landmark, TrendingUp } from 'lucide-react'

export type Tab =
  | 'custos'
  | 'almoxarifados'
  | 'burocracia'
  | 'estoque'
  | 'movimentacoes'
  | 'manutencao'

export type BurocaciaCategoria = 'banco' | 'vendas' | 'impostos' | 'taxas'

export const burocCatConfig: Record<
  BurocaciaCategoria,
  { label: string; color: string; icon: typeof FileText }
> = {
  banco: { label: 'Banco', color: '#007AFF', icon: Landmark },
  vendas: { label: 'Vendas', color: '#34C759', icon: TrendingUp },
  impostos: { label: 'Impostos', color: '#FF3B30', icon: FileText },
  taxas: { label: 'Taxas', color: '#FF9500', icon: Banknote },
}

export const burocMigrationSql = `CREATE TABLE IF NOT EXISTS obra_lancamentos_burocracia (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id    UUID          NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  categoria  TEXT          NOT NULL CHECK (categoria IN ('banco', 'vendas', 'impostos', 'taxas')),
  descricao  TEXT          NOT NULL,
  valor      NUMERIC(15,2) NOT NULL,
  data       DATE          NOT NULL,
  created_at TIMESTAMPTZ   DEFAULT now()
);

ALTER TABLE obra_lancamentos_burocracia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON obra_lancamentos_burocracia FOR ALL TO authenticated USING (true) WITH CHECK (true);`

export interface ObraLancamentoBurocracia {
  id: string
  obra_id: string
  categoria: BurocaciaCategoria
  descricao: string
  valor: number
  data: string
  created_at: string
}

export interface MaterialCategoria {
  id: string
  nome: string
  unidade?: string
}

export interface Material {
  id: string
  nome: string
  codigo?: string | null
  estoque_minimo?: number | null
  preco_unitario: number
  unidade?: string | null
  categoria?: MaterialCategoria | null
}

export interface Almoxarifado {
  id: string
  nome: string
  obra_id?: string | null
  responsavel?: string
  obra?: { id: string; nome: string } | null
}

export interface EstoqueItem {
  id: string
  quantidade: number
  almoxarifado_id: string
  material: Material
  almoxarifado: Almoxarifado
  created_at: string
}

export interface ObraCustos {
  orcamento: number
  total: number
  saldo: number
  percentual: number
  valorTerreno: number
  valorBurocracia: number
  valorConstrucao: number
  valorVenda: number
  tendencia: Array<{ mes: string; valor: number }>
  porCategoria: Array<{ categoria: string; valor: number }>
}

export interface ContaFinanceira {
  id: string
  banco: string
  agencia?: string
  numero_conta?: string
}

export interface BaixaTarget {
  materialId: string
  materialNome: string
  materialCodigo: string
  almoxarifadoId: string
  almoxarifadoNome: string
  quantidadeDisponivel: number
  unidade: string
  precoUnitario: number
}

export interface DeleteEstoqueTarget {
  id: string
  materialId: string
  materialNome: string
  almoxarifadoId: string
  almoxarifadoNome: string
  quantidade: number
  unidade: string
  precoUnitario: number
}

export interface CompraRecente {
  id: string
  material: string
  quantidade: number
  preco_unitario: number
  total: number
  almoxarifado: string
  data: string
}

export interface MaterialEstoque {
  id: string
  material: string
  quantidade: number
  unidade: string
  preco_unitario: number
  subtotal: number
  almoxarifado: string
}

export interface Fornecedor {
  id: string
  nome_fantasia?: string
  razao_social: string
}
