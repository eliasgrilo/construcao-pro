import { describe, expect, it } from 'vitest'
import { canSubmitVendaValidation } from './obra-detail-state'

describe('canSubmitVendaValidation', () => {
  it('aceita rateio quando a soma fica dentro da tolerancia compartilhada', () => {
    expect(
      canSubmitVendaValidation(
        '100,00',
        true,
        '50,00',
        '50,009',
        'conta-1',
        'conta-2',
        'PIX',
        '',
        '',
        false,
      ),
    ).toBe(true)
  })

  it('rejeita rateio quando a soma passa da tolerancia mesmo que o desvio seja pequeno', () => {
    expect(
      canSubmitVendaValidation(
        '100,00',
        true,
        '50,00',
        '50,05',
        'conta-1',
        'conta-2',
        'PIX',
        '',
        '',
        false,
      ),
    ).toBe(false)
  })
})
