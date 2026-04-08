// ─── Types ─────────────────────────────────────────────────────────────────────

export type FilterId = 'all' | 'PENDENTE' | 'PROCESSADA' | 'VINCULADA' | 'REJEITADA'

export type UploadStep = 'select' | 'preview' | 'matching' | 'finalizar'

export type NFRow = {
  id: string
  numero: string
  serie: string
  chave_acesso: string
  cnpj_emitente: string
  cnpj_destinatario: string | null
  nome_emitente: string | null
  fornecedor_id: string | null
  valor_total: number
  data_emissao: string
  status: 'PENDENTE' | 'PROCESSADA' | 'VINCULADA' | 'REJEITADA'
  finalidade: number | null
  xml_url: string | null
  created_at: string
  _count: { itens: number }
}

export type NFeParsed = {
  numero: string
  serie: string
  finalidade: number | null // <finNFe>: 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  data_emissao: string
  cnpj_emitente: string
  nome_emitente: string
  nome_fantasia_emitente: string | null
  ie_emitente: string | null // Inscrição Estadual — needed for fiscal reports + devolution
  fone_emitente: string | null
  endereco_emitente: string | null
  cnpj_destinatario: string | null
  valor_total: number
  chave_acesso: string
  pagamentos: NFePagamento[]
  valor_liquido: number
  vST: number
  vFrete: number
  vDesc: number
  vOutro: number
  vSeg: number
}

export type NFItemParsed = {
  descricao: string
  ncm: string | null
  cfop: string | null
  cest: string | null // <CEST>: mandatory for ICMS-ST products
  unidade: string
  quantidade: number
  valor_unitario: number
  valor_total: number // <vProd>: item gross total (before taxes/freight)
  valor_ipi: number // <vIPI>: IPI tax charged on top of product price
  valor_icms_st: number // <vICMSST>: ICMS-ST — the most common "invisible cost"
  gtin: string | null
  cProd: string | null
}

export type NFePagamento = {
  tPag: string // NF-e payment type: '01'=Dinheiro, '15'=Boleto, '17'=PIX, etc.
  vPag: number // payment amount
  xPag: string | null // payment description (optional)
  dVenc: string | null // due date (from <card> element, optional)
}

export type MaterialItem = {
  id: string
  nome: string
  codigo: string | null
  codigo_barras: string | null
  unidade: string | null
  categoria?: { id: string; nome: string; unidade: string } | null
}

export type AlmoxarifadoItem = {
  id: string
  nome: string
  obra?: { id: string; nome: string } | null
}

export type FornecedorItem = {
  id: string
  nome: string
  cnpj: string | null
}

export type GeminiMatchResult = {
  status: 'sucesso' | 'duvida' | 'erro'
  vinculo_sugerido?: {
    id_interno: string
    nome_interno: string
    confianca: number
    justificativa_logica: string
  } | null
  acoes_necessarias: string[]
}

export type MatchStatus = 'pending' | 'analyzing' | 'confirmed' | 'skipped'

export type ItemMatchState = {
  item: NFItemParsed
  index: number
  matchStatus: MatchStatus
  geminiResult: GeminiMatchResult | null
  /** true when geminiResult came from client-side matching (Gemini unavailable) */
  isLocalMatch: boolean
  confirmedMaterialId: string | null
  confirmedMaterialNome: string | null
  showAlternatives: boolean
  error: string | null
}

export type MatchMemory = Record<string, { id_interno: string; nome_interno: string }>

export type DepotAllocation = {
  almoxarifadoId: string
  quantidade: number
}

export type ItemDistribution = {
  itemIndex: number
  materialId: string
  materialNome: string
  quantidadeTotal: number
  valorUnitario: number
  unidade: string
  allocations: DepotAllocation[]
}
