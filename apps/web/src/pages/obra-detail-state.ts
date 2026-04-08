import { parseCurrency } from '@/components/ui/currency-input'
import type { MovimentacaoRow } from '@/hooks/use-supabase/catalogo'
import { useMemo } from 'react'
import type { BaixaTarget, EstoqueItem, ObraCustos, Tab } from './obra-detail-types'
import {
  type ExecuteVendaArgs,
  type ExecuteVendaSplitArgs,
  type ObraSaleMovementPayload,
  type ObraSaleReceivablePayload,
  VENDA_SPLIT_SUM_TOLERANCE,
  buildVendaSimplesPayload,
  buildVendaSplitPayload,
} from './obra-detail-venda-utils'

export function getInitialTab(obraId: string): Tab {
  try {
    const saved = sessionStorage.getItem(`obra-tab-${obraId}`)
    const valids: Tab[] = [
      'custos',
      'almoxarifados',
      'burocracia',
      'estoque',
      'movimentacoes',
      'manutencao',
    ]
    if (saved && valids.includes(saved as Tab)) return saved as Tab
  } catch {
    // sessionStorage may be unavailable (private browsing / quota exceeded)
  }
  return 'custos'
}

export function getIsoDateWithOffset(days = 0) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function useObraDetailsDerived(
  custos: ObraCustos | null | undefined,
  movimentacoes: MovimentacaoRow[],
  estoque: EstoqueItem[],
) {
  const investimentoCategoria = useMemo(() => {
    if (!custos) return []
    return [
      { categoria: 'Terreno', valor: custos.valorTerreno ?? 0, color: '#AF52DE' },
      { categoria: 'Burocracia', valor: custos.valorBurocracia ?? 0, color: '#007AFF' },
      { categoria: 'Construção', valor: custos.valorConstrucao ?? 0, color: '#FF9500' },
    ].filter((categoria) => categoria.valor > 0)
  }, [custos])

  const comprasRecentes = useMemo(() => {
    return movimentacoes
      .filter((movimentacao) => movimentacao.tipo === 'ENTRADA')
      .slice(0, 15)
      .map((movimentacao) => ({
        id: movimentacao.id,
        material: movimentacao.material?.nome ?? '—',
        quantidade: movimentacao.quantidade ?? 0,
        preco_unitario: movimentacao.preco_unitario ?? 0,
        total: (movimentacao.quantidade ?? 0) * (movimentacao.preco_unitario ?? 0),
        almoxarifado: movimentacao.almoxarifado?.nome ?? '—',
        data: movimentacao.created_at,
      }))
  }, [movimentacoes])

  const materiaisEstoque = useMemo(() => {
    return estoque.map((item) => ({
      id: item.id,
      material: item.material?.nome ?? '—',
      quantidade: item.quantidade ?? 0,
      unidade: item.material?.unidade ?? item.material?.categoria?.unidade ?? 'UN',
      preco_unitario: item.material?.preco_unitario ?? 0,
      subtotal: (item.quantidade ?? 0) * (item.material?.preco_unitario ?? 0),
      almoxarifado: item.almoxarifado?.nome ?? '—',
    }))
  }, [estoque])

  const materiaisEstoqueTotal = useMemo(
    () => materiaisEstoque.reduce((sum, material) => sum + material.subtotal, 0),
    [materiaisEstoque],
  )

  return { investimentoCategoria, comprasRecentes, materiaisEstoque, materiaisEstoqueTotal }
}

type CreateSaidaArgs = {
  p_material_id: string
  p_quantidade: number
  p_preco_unitario: number
  p_almoxarifado_id: string
  p_observacao?: string
}
type CreateSaidaCallbacks = { onSuccess: () => void; onError: () => void }
type ToastInput = {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function submitBaixa(
  baixaTarget: BaixaTarget | null,
  baixaQty: string,
  baixaObs: string,
  createSaida: { mutate: (args: CreateSaidaArgs, opts: CreateSaidaCallbacks) => void },
  toast: (opts: ToastInput) => void,
  resetFn: () => void,
) {
  if (!baixaTarget || !baixaQty) {
    if (!baixaQty) {
      toast({
        title: 'Entrada inválida',
        description: 'Preencha a quantidade.',
        variant: 'error',
      })
    }
    return
  }

  const baixaQtyNum = Number.parseFloat(baixaQty.replace(',', '.').replace(/[^0-9.]/g, ''))
  if (Number.isNaN(baixaQtyNum) || baixaQtyNum <= 0) {
    toast({
      title: 'Quantidade inválida',
      description: 'Informe um valor numérico positivo.',
      variant: 'error',
    })
    return
  }

  createSaida.mutate(
    {
      p_material_id: baixaTarget.materialId,
      p_quantidade: baixaQtyNum,
      p_preco_unitario: baixaTarget.precoUnitario,
      p_almoxarifado_id: baixaTarget.almoxarifadoId,
      p_observacao: baixaObs.trim() || undefined,
    },
    {
      onSuccess: () => {
        toast({
          title: 'Baixa registrada',
          description: `${baixaQty} ${baixaTarget.unidade} de ${baixaTarget.materialNome} retirados do ${baixaTarget.almoxarifadoNome}`,
          variant: 'success',
        })
        resetFn()
      },
      onError: () =>
        toast({
          title: 'Erro ao registrar baixa',
          description: 'Verifique a quantidade disponível.',
          variant: 'error',
        }),
    },
  )
}

export async function processarVendaTransaction(
  venda: number,
  vendaSplitEnabled: boolean,
  vendaConta1Valor: string,
  vendaSplitValor: string,
  obraId: string,
  argsSimples: ExecuteVendaArgs,
  argsSplit: ExecuteVendaSplitArgs,
  registerObraVenda: {
    mutateAsync: (args: {
      obra_id: string
      valor_venda: number
      movements: ObraSaleMovementPayload[]
      receivables: ObraSaleReceivablePayload[]
    }) => Promise<unknown>
  },
) {
  const payload = !vendaSplitEnabled
    ? buildVendaSimplesPayload(venda, argsSimples)
    : buildVendaSplitPayload(
        parseCurrency(vendaConta1Valor),
        parseCurrency(vendaSplitValor),
        argsSplit,
      )

  await registerObraVenda.mutateAsync({
    obra_id: obraId,
    valor_venda: venda,
    movements: payload.movements,
    receivables: payload.receivables,
  })
}

export function canSubmitVendaValidation(
  vendaInput: string,
  vendaSplitEnabled: boolean,
  vendaConta1Valor: string,
  vendaSplitValor: string,
  vendaContaId: string,
  vendaSplitContaId: string,
  vendaFormaPagamento: string,
  vendaParcelas: string,
  vendaTaxaCartao: string,
  vendaSubmitting: boolean,
) {
  const venda = parseCurrency(vendaInput)
  let splitOk = !vendaSplitEnabled

  if (vendaSplitEnabled) {
    const conta1Valor = parseCurrency(vendaConta1Valor)
    const conta2Valor = parseCurrency(vendaSplitValor)
    const splitValido = !!vendaContaId && !!vendaSplitContaId && conta1Valor > 0 && conta2Valor > 0
    const somaBate = Math.abs(conta1Valor + conta2Valor - venda) < VENDA_SPLIT_SUM_TOLERANCE
    splitOk = splitValido && somaBate
  }

  const hasPagamento =
    !!vendaFormaPagamento &&
    (vendaFormaPagamento !== 'CARTAO_CREDITO' || (!!vendaParcelas && vendaTaxaCartao !== ''))

  return venda > 0 && !!vendaContaId && hasPagamento && splitOk && !vendaSubmitting
}

export function isLowStock(item: EstoqueItem) {
  const minimo = item.material?.estoque_minimo ?? 0
  const quantidade = item.quantidade ?? 0
  return minimo > 0 && quantidade <= minimo
}

export function getUnidadeForEstoque(item: EstoqueItem) {
  return item.material?.unidade ?? item.material?.categoria?.unidade ?? 'UN'
}
