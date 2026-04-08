import { describe, expect, it } from 'vitest'
import {
  addMonthsClamped,
  buildVendaSimplesPayload,
  buildVendaSplitPayload,
} from './obra-detail-venda-utils'

describe('addMonthsClamped', () => {
  it('clampa parcelas em fim de mes sem pular para o mes seguinte', () => {
    const base = new Date('2026-01-31T12:00:00')

    expect(addMonthsClamped(base, 0).toISOString().slice(0, 10)).toBe('2026-01-31')
    expect(addMonthsClamped(base, 1).toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(addMonthsClamped(base, 2).toISOString().slice(0, 10)).toBe('2026-03-31')
  })

  it('respeita fevereiro em ano bissexto', () => {
    const base = new Date('2024-01-31T12:00:00')

    expect(addMonthsClamped(base, 1).toISOString().slice(0, 10)).toBe('2024-02-29')
  })
})

describe('buildVenda payloads', () => {
  it('gera vencimentos mensais corretos para venda simples parcelada', () => {
    const payload = buildVendaSimplesPayload(3000, {
      vendaFormaPagamento: 'CARTAO_CREDITO',
      vendaParcelas: '3',
      vendaTaxaCartao: '0',
      vendaContaId: 'conta-1',
      vendaSubconta: 'CAIXA',
      nomeObra: 'Obra Teste',
      obraId: 'obra-1',
      dataPrimeiraParcela: '2026-01-31',
    })

    expect(payload.movements).toHaveLength(0)
    expect(payload.receivables[0]?.parcelas.map((parcela) => parcela.vencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ])
  })

  it('mantem o mesmo comportamento no rateio da conta 2', () => {
    const payload = buildVendaSplitPayload(1000, 2000, {
      vendaFormaPagamento: 'CARTAO_CREDITO',
      vendaParcelas: '2',
      vendaTaxaCartao: '0',
      vendaContaId: 'conta-1',
      vendaSplitContaId: 'conta-2',
      vendaSubconta: 'CAIXA',
      nomeObra: 'Obra Teste',
      obraId: 'obra-1',
      dataPrimeiraParcela: '2026-01-31',
    })

    expect(payload.movements).toHaveLength(1)
    expect(payload.receivables[0]?.parcelas.map((parcela) => parcela.vencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
    ])
  })
})
