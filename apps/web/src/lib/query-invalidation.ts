import { queryKeys } from '@/lib/query-keys'
import type { QueryClient } from '@tanstack/react-query'

type QueryInvalidator = Pick<QueryClient, 'invalidateQueries'>

function isObraQuery(queryKey: readonly unknown[], minimumLength: number) {
  return queryKey[0] === 'obra' && queryKey.length >= minimumLength
}

export function invalidateAllObraQueries(qc: QueryInvalidator) {
  qc.invalidateQueries({
    predicate: (query) => isObraQuery(query.queryKey, 2),
  })
}

export function invalidateDerivedObraQueries(qc: QueryInvalidator) {
  qc.invalidateQueries({
    predicate: (query) => isObraQuery(query.queryKey, 3),
  })
}

export function invalidateMovimentacaoDerivedQueries(qc: QueryInvalidator) {
  qc.invalidateQueries({ queryKey: queryKeys.estoque.all() })
  qc.invalidateQueries({ queryKey: queryKeys.movimentacoes.all() })
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.movimentacoesRecentes() })
  invalidateDerivedObraQueries(qc)
}

export function invalidateEntradaAnalyticsQueries(qc: QueryInvalidator) {
  qc.invalidateQueries({ queryKey: ['material'] })
  qc.invalidateQueries({ queryKey: queryKeys.fornecedores.categoriaMap() })
  qc.invalidateQueries({ queryKey: queryKeys.fornecedores.priceRanking() })
}
