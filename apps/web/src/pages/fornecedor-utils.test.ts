import { describe, expect, it } from 'vitest'
import {
  formatMonthLabel,
  getFornecedorAvatarColor,
  getFornecedorInitials,
  getMonthKey,
} from './fornecedor-utils'

describe('fornecedor-utils', () => {
  it('returns stable avatar colors for the same supplier name', () => {
    expect(getFornecedorAvatarColor('Construtora Aurora')).toBe(
      getFornecedorAvatarColor('Construtora Aurora'),
    )
  })

  it('builds initials from the first two words when available', () => {
    expect(getFornecedorInitials('Casa do Cimento')).toBe('CD')
    expect(getFornecedorInitials('Quartz')).toBe('QU')
  })

  it('normalizes timestamps and date-only strings into a month key', () => {
    expect(getMonthKey('2026-04-18')).toBe('2026-04')
    expect(getMonthKey('2026-04-18 10:30:00+00')).toBe('2026-04')
  })

  it('formats month labels in pt-BR with leading capital letter', () => {
    expect(formatMonthLabel('2026-04')).toBe('Abril de 2026')
  })
})
