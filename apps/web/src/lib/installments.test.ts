import { describe, expect, it } from 'vitest'
import {
  buildInstallmentPreview,
  buildInstallmentSchedule,
  getRelativeDueLabel,
  groupItemsByMonth,
} from './installments'

describe('buildInstallmentSchedule', () => {
  it('distributes values with cent rounding preserved on the last installment', () => {
    const schedule = buildInstallmentSchedule({
      total: 100,
      firstDueDate: '2026-04-15',
      installmentCount: 3,
    })

    expect(schedule).toEqual([
      { numero_parcela: 1, total_parcelas: 3, valor: 33.33, vencimento: '2026-04-15' },
      { numero_parcela: 2, total_parcelas: 3, valor: 33.33, vencimento: '2026-05-15' },
      { numero_parcela: 3, total_parcelas: 3, valor: 33.34, vencimento: '2026-06-15' },
    ])
  })

  it('clamps end-of-month due dates to the last valid day of the target month', () => {
    const schedule = buildInstallmentSchedule({
      total: 300,
      firstDueDate: '2026-01-31',
      installmentCount: 3,
    })

    expect(schedule.map((item) => item.vencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ])
  })

  it('returns an empty schedule for invalid inputs', () => {
    expect(
      buildInstallmentSchedule({
        total: 0,
        firstDueDate: '2026-04-15',
        installmentCount: 2,
      }),
    ).toEqual([])

    expect(
      buildInstallmentSchedule({
        total: 100,
        firstDueDate: 'invalid-date',
        installmentCount: 2,
      }),
    ).toEqual([])
  })
})

describe('buildInstallmentPreview', () => {
  it('creates a limited preview with localized labels', () => {
    const schedule = buildInstallmentSchedule({
      total: 400,
      firstDueDate: '2026-04-10',
      installmentCount: 4,
    })

    expect(buildInstallmentPreview(schedule, { limit: 2 })).toEqual([
      { label: '1/4', valor: 100, data: '10 de abr.' },
      { label: '2/4', valor: 100, data: '10 de mai.' },
    ])
  })
})

describe('groupItemsByMonth', () => {
  it('groups items by due month and accumulates totals', () => {
    const grouped = groupItemsByMonth([
      { id: '1', valor: 10, vencimento: '2026-04-10' },
      { id: '2', valor: '25.5', vencimento: '2026-04-22' },
      { id: '3', valor: 12, vencimento: '2026-05-03' },
    ])

    expect(Object.keys(grouped)).toEqual(['2026-04', '2026-05'])
    expect(grouped['2026-04']?.total).toBe(35.5)
    expect(grouped['2026-04']?.items).toHaveLength(2)
    expect(grouped['2026-05']?.mesLabel).toBe('maio de 2026')
  })
})

describe('getRelativeDueLabel', () => {
  it('returns human-friendly relative labels', () => {
    expect(getRelativeDueLabel('2026-04-10', '2026-04-10')).toBe('Hoje')
    expect(getRelativeDueLabel('2026-04-11', '2026-04-10')).toBe('Amanhã')
    expect(getRelativeDueLabel('2026-04-14', '2026-04-10')).toBe('4d')
    expect(getRelativeDueLabel('2026-04-25', '2026-04-10')).toBe('3sem')
    expect(getRelativeDueLabel('2026-05-15', '2026-04-10')).toBe('2m')
    expect(getRelativeDueLabel('2026-04-08', '2026-04-10')).toBe('2d atraso')
  })
})
