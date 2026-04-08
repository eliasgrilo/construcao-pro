import { describe, expect, it, vi } from 'vitest'
import {
  invalidateAllObraQueries,
  invalidateDerivedObraQueries,
  invalidateEntradaAnalyticsQueries,
  invalidateMovimentacaoDerivedQueries,
} from './query-invalidation'

function createInvalidatorMock() {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  }
}

describe('query invalidation helpers', () => {
  it('targets all obra queries when a full obra refresh is required', () => {
    const qc = createInvalidatorMock()

    invalidateAllObraQueries(qc)

    expect(qc.invalidateQueries).toHaveBeenCalledTimes(1)
    const [filters] = qc.invalidateQueries.mock.calls[0] ?? []
    expect(filters.predicate({ queryKey: ['obra', '123'] })).toBe(true)
    expect(filters.predicate({ queryKey: ['obra', '123', 'custos'] })).toBe(true)
    expect(filters.predicate({ queryKey: ['obras'] })).toBe(false)
  })

  it('limits derived obra invalidation to nested detail queries', () => {
    const qc = createInvalidatorMock()

    invalidateDerivedObraQueries(qc)

    const [filters] = qc.invalidateQueries.mock.calls[0] ?? []
    expect(filters.predicate({ queryKey: ['obra', '123'] })).toBe(false)
    expect(filters.predicate({ queryKey: ['obra', '123', 'estoque'] })).toBe(true)
  })

  it('refreshes movement-driven dashboards and obra detail caches together', () => {
    const qc = createInvalidatorMock()

    invalidateMovimentacaoDerivedQueries(qc)

    expect(qc.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['estoque'] }],
      [{ queryKey: ['movimentacoes'] }],
      [{ queryKey: ['dashboard', 'stats'] }],
      [{ queryKey: ['dashboard', 'movimentacoes-recentes'] }],
      [expect.objectContaining({ predicate: expect.any(Function) })],
    ])
  })

  it('refreshes entry analytics fed by supplier and material history', () => {
    const qc = createInvalidatorMock()

    invalidateEntradaAnalyticsQueries(qc)

    expect(qc.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['material'] }],
      [{ queryKey: ['fornecedores', 'categoria-map'] }],
      [{ queryKey: ['fornecedores', 'price-ranking'] }],
    ])
  })
})
