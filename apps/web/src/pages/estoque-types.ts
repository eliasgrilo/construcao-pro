export interface EstoqueItem {
  id: string
  quantidade?: number
  created_at?: string
  almoxarifado?: {
    id: string
    nome: string
    obra?: { id: string; nome: string; endereco?: string | null } | null
  } | null
  material?: {
    id: string
    nome: string
    codigo?: string | null
    unidade?: string
    preco_unitario?: number
    estoque_minimo?: number | null
    categoria?: { nome: string; unidade?: string | null } | null
  } | null
}

export interface ObraGroup {
  obraId: string
  obraNome: string
  obraEndereco?: string
  items: EstoqueItem[]
  totalItems: number
  totalQty: number
  totalCost: number
  lowStockCount: number
  almoxarifados: number
}
