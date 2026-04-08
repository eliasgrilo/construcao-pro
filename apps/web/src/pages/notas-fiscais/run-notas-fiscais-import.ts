import type {
  FinanceiroConta,
  useCreateContaPagar,
  useRegisterFinanceiroMovement,
} from '@/hooks/use-supabase'
import {
  invalidateEntradaAnalyticsQueries,
  invalidateMovimentacaoDerivedQueries,
} from '@/lib/query-invalidation'
import type { QueryClient } from '@tanstack/react-query'
import type {
  ItemDistribution,
  ItemMatchState,
  NFItemParsed,
  NFePagamento,
  NFeParsed,
} from '../notas-fiscais-types'
import { PAGAMENTO_IMEDIATO_TPAG } from '../notas-fiscais-utils'
import {
  dispatchDistributions,
  processFinanceiroRecords,
  processMissingMaterials,
  registerNFeItems,
  uploadXmlAndCreateNFe,
} from './services/nfe-import-service'

type Params = {
  file: File
  parsed: { nf: NFeParsed; itens: NFItemParsed[] }
  parsedPagamentos: NFePagamento[]
  immediateDebitAmount: number
  contas: FinanceiroConta[]
  selectedContaId: string | null
  matchStates: ItemMatchState[]
  matchedFornecedorId: string | null
  rawXml: string | null
  distributions: ItemDistribution[]
  reviewAlmoxarifadoId: string | null
  almoxarifados: Array<{ id: string }>
  reviewEditedNames: Map<number, string>
  registerFinanceiroMovement: ReturnType<typeof useRegisterFinanceiroMovement>
  createContaPagar: ReturnType<typeof useCreateContaPagar>
  qc: QueryClient
  toast: (input: { title: string; description?: string; variant?: 'error' | 'success' }) => void
  resetUpload: () => void
}

export async function runNotasFiscaisImport(params: Params) {
  const {
    immediateDebitAmount,
    contas,
    selectedContaId,
    toast,
    matchStates,
    qc,
    resetUpload,
    parsed,
    isNormalPurchase = parsed.nf.finalidade === null || parsed.nf.finalidade === 1,
  } = {
    ...params,
    isNormalPurchase: params.parsed.nf.finalidade === null || params.parsed.nf.finalidade === 1,
  }

  if (immediateDebitAmount > 0 && contas.length > 0 && !selectedContaId) {
    toast({ title: 'Selecione uma conta para débito', variant: 'error' })
    return
  }

  try {
    const hasAnyConfirmedItems = matchStates.some((state) => state.matchStatus === 'confirmed')

    const nfData = await uploadXmlAndCreateNFe(
      {
        parsed: params.parsed,
        matchedFornecedorId: params.matchedFornecedorId,
        rawXml: params.rawXml,
      },
      params.file,
      hasAnyConfirmedItems,
    )

    if (!nfData) throw new Error('Falha ao criar nota fiscal.')

    const skippedItems = matchStates.filter(
      (s) =>
        s.matchStatus === 'skipped' || s.matchStatus === 'pending' || s.matchStatus === 'analyzing',
    )

    // Process new materials (auto creation)
    const { newMaterialMap, newMaterialNomeMap } = await processMissingMaterials(
      skippedItems,
      params.reviewEditedNames,
      nfData,
      params.parsed,
      params.matchedFornecedorId,
    )

    // Build distributions replacing unlinked materials with the newly created ones
    const resolvedDistributions = params.distributions.map((d) =>
      !d.materialId && newMaterialMap.has(d.itemIndex)
        ? { ...d, materialId: newMaterialMap.get(d.itemIndex) as string }
        : d,
    )

    // Items Registration (incl. proportioning)
    await registerNFeItems(
      nfData.id,
      params.parsed,
      matchStates,
      newMaterialMap,
      params.matchedFornecedorId,
    )

    // Distributions
    let movimentacoesCriadas = 0
    let movimentacoesFalhadas = 0

    if (isNormalPurchase) {
      const results = await dispatchDistributions(
        resolvedDistributions,
        nfData,
        params.parsed,
        params.matchedFornecedorId,
      )
      movimentacoesCriadas = results.movimentacoesCriadas
      movimentacoesFalhadas = results.movimentacoesFalhadas

      if (movimentacoesCriadas > 0) {
        invalidateMovimentacaoDerivedQueries(qc)
        qc.invalidateQueries({ queryKey: ['materiais'] })
        invalidateEntradaAnalyticsQueries(qc)
        if (params.matchedFornecedorId) {
          qc.invalidateQueries({
            queryKey: ['movimentacoes', 'fornecedor', params.matchedFornecedorId],
          })
        }
      }
    }

    qc.invalidateQueries({ queryKey: ['notas-fiscais'] })

    // Finance Flow
    try {
      if (isNormalPurchase) {
        const immediateDebitTotal = params.parsedPagamentos
          .filter((p) => PAGAMENTO_IMEDIATO_TPAG.has(p.tPag))
          .reduce((s, p) => s + p.vPag, 0)

        const { failedDebit } = await processFinanceiroRecords(
          params.createContaPagar,
          immediateDebitTotal,
          selectedContaId,
          params.registerFinanceiroMovement,
          params.parsed,
          params.parsedPagamentos,
          params.matchedFornecedorId,
          nfData.id,
        )

        if (failedDebit) {
          toast({ title: 'NF importada, falha ao debitar na conta selecionada.', variant: 'error' })
        } else if (immediateDebitTotal > 0 && selectedContaId) {
          qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
        }
        qc.invalidateQueries({ queryKey: ['contas_pagar'] })
      }
    } catch {
      toast({ title: 'NF importada, mas falha ao gerar contas a pagar.', variant: 'error' })
    }

    toast({
      title:
        movimentacoesFalhadas > 0
          ? `${movimentacoesFalhadas} movimentação(ões) falharam`
          : `NF-e nº ${parsed.nf.numero} importada`,
      description:
        movimentacoesFalhadas > 0
          ? `${movimentacoesCriadas} sucesso. Verifique o estoque.`
          : movimentacoesCriadas > 0
            ? `${movimentacoesCriadas} entradas registradas.`
            : 'Importada sem estoque.',
      variant: movimentacoesFalhadas > 0 ? 'error' : 'success',
    })

    resetUpload()
  } catch (error) {
    toast({
      title: 'Erro ao importar NF-e',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      variant: 'error',
    })
  }
}
