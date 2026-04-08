import { describe, expect, it } from 'vitest'
import { validateObraDetailRouteSearch, validateObrasRouteSearch } from './obra-route-search'

describe('obra route search validators', () => {
  it('keeps only supported obra filters and route origins', () => {
    expect(
      validateObrasRouteSearch({
        from: 'dashboard',
        tab: 'ATIVA',
      }),
    ).toEqual({
      from: 'dashboard',
      tab: 'ATIVA',
    })
  })

  it('drops invalid search params instead of propagating garbage', () => {
    expect(
      validateObrasRouteSearch({
        from: 'outro-lugar',
        tab: 'QUALQUER_COISA',
      }),
    ).toEqual({
      from: undefined,
      tab: undefined,
    })
  })

  it('normalizes obra detail origin search independently', () => {
    expect(validateObraDetailRouteSearch({ from: 'dashboard' })).toEqual({
      from: 'dashboard',
    })
    expect(validateObraDetailRouteSearch({ from: 'foo' })).toEqual({
      from: undefined,
    })
  })
})
