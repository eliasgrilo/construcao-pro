export interface ExecuteVendaArgs {
  vendaFormaPagamento: string
  vendaParcelas: string
  vendaTaxaCartao?: string
  vendaContaId: string
  vendaSubconta: 'CAIXA' | 'APLICADO' | 'APLICACAO'
  nomeObra: string
  obraId?: string | null
  /** Date when à vista payment is received (YYYY-MM-DD). Defaults to today. */
  dataPagamento?: string
  /** Date of the first installment for parceled payments (YYYY-MM-DD). Defaults to today. */
  dataPrimeiraParcela?: string
}

export interface ExecuteVendaSplitArgs extends ExecuteVendaArgs {
  vendaSplitContaId: string
}

export interface ObraSaleMovementPayload {
  conta_id: string
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
  subconta: 'CAIXA' | 'APLICADO'
  motivo: string
  valor: number
  data: string
  delta_caixa: number
  delta_aplicado: number
  destino_conta_id?: string | null
  delta_destino_caixa?: number
  transferencia_destino_id?: string | null
}

export interface ObraSaleReceivablePayload {
  descricao: string
  cliente: string | null
  obra_id: string | null
  observacoes: string | null
  valor_total: number
  parcelas: Array<{
    numero_parcela: number
    total_parcelas: number
    valor: number
    vencimento: string
  }>
}

export const VENDA_SPLIT_SUM_TOLERANCE = 0.01

function getFormLabel(pag: string) {
  const map: Record<string, string> = {
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de Crédito',
    CARTAO_DEBITO: 'Cartão de Débito',
    BOLETO: 'Boleto',
    TRANSFERENCIA: 'Transferência',
    DINHEIRO: 'Dinheiro',
    CHEQUE: 'Cheque',
  }
  return map[pag] || pag
}

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function parseBaseDate(baseDate?: string) {
  return baseDate ? new Date(`${baseDate}T12:00:00`) : new Date()
}

export function addMonthsClamped(baseDate: Date, offsetMonths: number) {
  const year = baseDate.getFullYear()
  const monthIndex = baseDate.getMonth() + offsetMonths
  const day = baseDate.getDate()
  const targetYear = year + Math.floor(monthIndex / 12)
  const targetMonth = ((monthIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()

  return new Date(
    targetYear,
    targetMonth,
    Math.min(day, lastDayOfTargetMonth),
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds(),
  )
}

function getDateStr(offsetMonths: number, baseDate?: string) {
  return formatIsoDate(addMonthsClamped(parseBaseDate(baseDate), offsetMonths))
}

/** PMT formula for compound interest installments.
 *  Returns the per-installment value.
 *  ratePercent: monthly rate as percentage, e.g. 1.99 means 1.99%/month.
 */
export function calcPMT(pv: number, ratePercent: number, n: number): number {
  if (n <= 1) return pv
  if (ratePercent === 0) return pv / n
  const r = ratePercent / 100
  return (pv * r) / (1 - (1 + r) ** -n)
}

function buildParcelas(
  totalValor: number,
  nParcelas: number,
  taxaMensal = 0,
  startOffsetMonths = 0,
  baseDate?: string,
): Array<{ numero_parcela: number; total_parcelas: number; valor: number; vencimento: string }> {
  const pmt =
    taxaMensal > 0 && nParcelas > 1
      ? Math.round(calcPMT(totalValor, taxaMensal, nParcelas) * 100) / 100
      : Math.round((totalValor / nParcelas) * 100) / 100

  const totalComJuros = pmt * nParcelas

  return Array.from({ length: nParcelas }, (_, i) => ({
    numero_parcela: i + 1,
    total_parcelas: nParcelas,
    valor:
      i < nParcelas - 1 ? pmt : Math.round((totalComJuros - pmt * (nParcelas - 1)) * 100) / 100,
    vencimento: getDateStr(startOffsetMonths + i, baseDate),
  }))
}

export function buildVendaSimplesPayload(
  venda: number,
  args: ExecuteVendaArgs,
): {
  movements: ObraSaleMovementPayload[]
  receivables: ObraSaleReceivablePayload[]
} {
  const isCredit = args.vendaFormaPagamento === 'CARTAO_CREDITO'
  const isBoleto = args.vendaFormaPagamento === 'BOLETO'
  const nParcelas = (isCredit || isBoleto) && args.vendaParcelas ? Number(args.vendaParcelas) : 1
  const taxaMensal = isCredit ? Number(args.vendaTaxaCartao || '0') : 0
  const subconta: 'CAIXA' | 'APLICADO' = args.vendaSubconta === 'CAIXA' ? 'CAIXA' : 'APLICADO'
  const formLabel = getFormLabel(args.vendaFormaPagamento)

  if (nParcelas === 1) {
    return {
      movements: [
        {
          conta_id: args.vendaContaId,
          tipo: 'ENTRADA',
          subconta,
          motivo: `Venda: ${args.nomeObra} — ${formLabel}`,
          valor: venda,
          data: getDateStr(0, args.dataPagamento),
          delta_caixa: subconta === 'CAIXA' ? venda : 0,
          delta_aplicado: subconta === 'APLICADO' ? venda : 0,
        },
      ],
      receivables: [],
    }
  }

  return {
    movements: [],
    receivables: [
      {
        descricao: `Venda: ${args.nomeObra} — ${formLabel}`,
        cliente: null,
        obra_id: args.obraId ?? null,
        observacoes: null,
        valor_total: venda,
        parcelas: buildParcelas(venda, nParcelas, taxaMensal, 0, args.dataPrimeiraParcela),
      },
    ],
  }
}

export function buildVendaSplitPayload(
  conta1Val: number,
  conta2Val: number,
  args: ExecuteVendaSplitArgs,
): { movements: ObraSaleMovementPayload[]; receivables: ObraSaleReceivablePayload[] } {
  const isCredit = args.vendaFormaPagamento === 'CARTAO_CREDITO'
  const isBoleto = args.vendaFormaPagamento === 'BOLETO'
  const nParcelas = (isCredit || isBoleto) && args.vendaParcelas ? Number(args.vendaParcelas) : 1
  const taxaMensal = isCredit ? Number(args.vendaTaxaCartao || '0') : 0
  const subconta: 'CAIXA' | 'APLICADO' = args.vendaSubconta === 'CAIXA' ? 'CAIXA' : 'APLICADO'
  const formLabel = getFormLabel(args.vendaFormaPagamento)

  const movements: ObraSaleMovementPayload[] = [
    {
      conta_id: args.vendaContaId,
      tipo: 'ENTRADA',
      subconta,
      motivo: `Venda: ${args.nomeObra} — ${formLabel} (à vista)`,
      valor: conta1Val,
      data: getDateStr(0, args.dataPagamento),
      delta_caixa: subconta === 'CAIXA' ? conta1Val : 0,
      delta_aplicado: subconta === 'APLICADO' ? conta1Val : 0,
    },
  ]

  const receivables: ObraSaleReceivablePayload[] = []

  if (conta2Val <= 0 || !args.vendaSplitContaId) {
    return { movements, receivables }
  }

  if (nParcelas === 1) {
    movements.push({
      conta_id: args.vendaSplitContaId,
      tipo: 'ENTRADA',
      subconta: 'CAIXA',
      motivo: `Venda: ${args.nomeObra} — ${formLabel} (Conta 2)`,
      valor: conta2Val,
      data: getDateStr(0, args.dataPagamento),
      delta_caixa: conta2Val,
      delta_aplicado: 0,
    })
  } else {
    receivables.push({
      descricao: `Venda: ${args.nomeObra} — ${formLabel} (Conta 2)`,
      cliente: null,
      obra_id: args.obraId ?? null,
      observacoes: null,
      valor_total: conta2Val,
      parcelas: buildParcelas(conta2Val, nParcelas, taxaMensal, 0, args.dataPrimeiraParcela),
    })
  }

  return { movements, receivables }
}
