// ─── Apple System Colors ────────────────────────────────
export const SYSTEM_COLORS = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  teal: '#5AC8FA',
  gray: '#8E8E93',
  pink: '#FF2D55',
  indigo: '#5856D6',
} as const

// ─── Budget Thresholds (percent) ────────────────────────
export const BUDGET_WARNING_THRESHOLD = 70
export const BUDGET_DANGER_THRESHOLD = 90

// ─── Stock movement types ────────────────────────────────
export const MOV_TIPO = {
  ENTRADA: 'ENTRADA',
  SAIDA: 'SAIDA',
  TRANSFERENCIA: 'TRANSFERENCIA',
} as const
export type MovTipo = (typeof MOV_TIPO)[keyof typeof MOV_TIPO]

// ─── Transfer approval status ────────────────────────────
export const TRANSFER_STATUS = {
  PENDENTE: 'PENDENTE',
  APROVADA_NIVEL_1: 'APROVADA_NIVEL_1',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA',
} as const
export type TransferStatus = (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS]

// ─── Payment methods ──────────────────────────────────────
export const FORMA_PAGAMENTO = {
  PIX: 'PIX',
  BOLETO: 'BOLETO',
  CARTAO_DEBITO: 'CARTAO_DEBITO',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  DINHEIRO: 'DINHEIRO',
  TRANSFERENCIA: 'TRANSFERENCIA',
} as const
export type FormaPagamento = (typeof FORMA_PAGAMENTO)[keyof typeof FORMA_PAGAMENTO]

export const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
  DINHEIRO: 'Dinheiro',
  TRANSFERENCIA: 'Transf.',
}

// ─── Obra status ──────────────────────────────────────────
export const OBRA_STATUS = {
  ATIVA: 'ATIVA',
  FINALIZADA: 'FINALIZADA',
  PAUSADA: 'PAUSADA',
  VENDIDO: 'VENDIDO',
  TERRENO: 'TERRENO',
} as const
export type ObraStatus = (typeof OBRA_STATUS)[keyof typeof OBRA_STATUS]

// ─── User roles ───────────────────────────────────────────
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  GESTOR: 'GESTOR',
  ALMOXARIFE: 'ALMOXARIFE',
  VISUALIZADOR: 'VISUALIZADOR',
} as const
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

// ─── Financial subconta ───────────────────────────────────
export const SUBCONTA = {
  CAIXA: 'CAIXA',
  APLICADO: 'APLICADO',
} as const
export type Subconta = (typeof SUBCONTA)[keyof typeof SUBCONTA]

// ─── Storage buckets ──────────────────────────────────────
export const STORAGE_BUCKET = {
  DOCUMENTOS: 'documentos',
  NOTAS_FISCAIS: 'notas-fiscais',
} as const
