export type RateioInput = {
  valorTotalItem: number
}

export type RateioResult = {
  frete: number
  desconto: number
}

export function calculateRateios(
  items: RateioInput[],
  freteTotalNFe: number,
  descontoTotalNFe: number,
): RateioResult[] {
  if (items.length === 0) return []

  const totalItemsValue = items.reduce((sum, item) => sum + item.valorTotalItem, 0)

  const results: RateioResult[] = []

  let freteApportioned = 0
  let descApportioned = 0
  const lastIdx = items.length - 1

  for (let index = 0; index < items.length; index++) {
    const item = items[index]

    if (index === lastIdx) {
      results.push({
        frete: Number((freteTotalNFe - freteApportioned).toFixed(2)),
        desconto: Number((descontoTotalNFe - descApportioned).toFixed(2)),
      })
    } else {
      const proportion = totalItemsValue > 0 ? item.valorTotalItem / totalItemsValue : 0
      const rateioFrete = Number((proportion * freteTotalNFe).toFixed(2))
      const rateioDesconto = Number((proportion * descontoTotalNFe).toFixed(2))

      freteApportioned += rateioFrete
      descApportioned += rateioDesconto

      results.push({
        frete: rateioFrete,
        desconto: rateioDesconto,
      })
    }
  }

  return results
}
