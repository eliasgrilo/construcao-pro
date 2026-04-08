import type { BaixaTarget, EstoqueItem } from './obra-detail'

export function parseCurrency(v: string) {
  if (!v) return 0
  return Number(v.replace(/\./g, '').replace(',', '.'))
}

export function parseDecimalInput(v: string) {
  return Number.parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, ''))
}

export interface ObraDetailEstoqueTabProps {
  obraId: string
  estoque: EstoqueItem[]
  isLoading?: boolean
  setBaixaTarget: (val: BaixaTarget) => void
}

export const ESTOQUE_CATEGORY_ALL = 'ALL'

export const ESTOQUE_PAYMENT_OPTIONS = [
  { value: 'dinheiro', label: 'À vista (Dinheiro)' },
  { value: 'pix', label: 'PIX' },
  { value: 'debito', label: 'Cartão de Débito' },
  { value: 'credito', label: 'Cartão de Crédito' },
  { value: 'boleto', label: 'Boleto (A Prazo)' },
  { value: 'transferencia', label: 'Transferência Bancária' },
] as const

export type EntradaSubconta = 'CAIXA' | 'APLICADO'

export interface EntradaDialogState {
  open: boolean
  materialId: string
  qty: string
  preco: string
  unidade: string
  pagamento: string
  almoxId: string
  fornecedorId: string
  contaId: string
  subconta: EntradaSubconta
  obs: string
}

export type EntradaDialogField = Exclude<keyof EntradaDialogState, 'open'>

export function createEntradaDialogState(): EntradaDialogState {
  return {
    open: false,
    materialId: '',
    qty: '',
    preco: '',
    unidade: '',
    pagamento: '',
    almoxId: '',
    fornecedorId: '',
    contaId: '',
    subconta: 'CAIXA',
    obs: '',
  }
}

export interface TransferDialogState {
  open: boolean
  materialId: string
  almoxId: string
  almoxDestinoId: string
  qty: string
}

export type TransferDialogField = Exclude<keyof TransferDialogState, 'open'>

export function createTransferDialogState(): TransferDialogState {
  return {
    open: false,
    materialId: '',
    almoxId: '',
    almoxDestinoId: '',
    qty: '',
  }
}
