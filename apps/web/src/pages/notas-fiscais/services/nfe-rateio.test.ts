import { describe, expect, it } from 'vitest'
import { calculateRateios } from './nfe-rateio'

describe('NFe Rateio Service', () => {
  it('should apportion frete and desconto correctly avoiding penny differences', () => {
    const items = [
      { valorTotalItem: 100 },
      { valorTotalItem: 200 },
      { valorTotalItem: 300 }, // Total = 600
    ]

    const result = calculateRateios(items, 60.05, 15.01)

    // Expected logic:
    // Item 1: 100/600 * 60.05 = 10.008333 -> 10.01 (frete), 100/600 * 15.01 = 2.50166 -> 2.50 (desc)
    // Item 2: 200/600 * 60.05 = 20.016666 -> 20.02 (frete), 200/600 * 15.01 = 5.00333 -> 5.00 (desc)
    // Item 3 (last): Rest.
    // Fretes: Total = 60.05. Apportioned 10.01 + 20.02 = 30.03. Last item gets 60.05 - 30.03 = 30.02.
    // Descontos: Total = 15.01. Apportioned 2.50 + 5.00 = 7.50. Last item gets 15.01 - 7.50 = 7.51.

    expect(result.length).toBe(3)

    expect(result[0]?.frete).toBe(10.01)
    expect(result[0]?.desconto).toBe(2.5)

    expect(result[1]?.frete).toBe(20.02)
    expect(result[1]?.desconto).toBe(5.0)

    expect(result[2]?.frete).toBe(30.02)
    expect(result[2]?.desconto).toBe(7.51)
  })

  it('should handle zero totals gracefully', () => {
    const items = [{ valorTotalItem: 0 }, { valorTotalItem: 0 }]

    const result = calculateRateios(items, 10, 5)

    expect(result[0]?.frete).toBe(0)
    expect(result[1]?.frete).toBe(10)
    expect(result[0]?.desconto).toBe(0)
    expect(result[1]?.desconto).toBe(5)
  })

  it('should return empty for empty items list', () => {
    expect(calculateRateios([], 100, 50)).toEqual([])
  })
})
