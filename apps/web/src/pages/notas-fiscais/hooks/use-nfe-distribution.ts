import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ItemDistribution, ItemMatchState } from '../../notas-fiscais-types'

export function useNFeDistribution(
  matchStates: ItemMatchState[],
  reviewEditedNames: Map<number, string>,
) {
  const [distributions, setDistributions] = useState<ItemDistribution[]>([])
  const [reviewAlmoxarifadoId, setReviewAlmoxarifadoId] = useState<string | null>(null)

  const buildDistributions = useCallback(() => {
    const validItems = matchStates.filter((s) => s.matchStatus === 'confirmed')

    const confirmedDist: ItemDistribution[] = validItems.map((s) => ({
      itemIndex: s.index,
      materialId: s.confirmedMaterialId || '',
      materialNome: reviewEditedNames.get(s.index) ?? s.confirmedMaterialNome ?? '',
      quantidadeTotal: s.item.quantidade,
      valorUnitario: s.item.valor_unitario,
      unidade: s.item.unidade,
      allocations: reviewAlmoxarifadoId
        ? [{ almoxarifadoId: reviewAlmoxarifadoId, quantidade: s.item.quantidade }]
        : [],
    }))

    const skippedDist: ItemDistribution[] = matchStates
      .filter((s) => s.matchStatus !== 'confirmed')
      .map((s) => ({
        itemIndex: s.index,
        materialId: '',
        materialNome: reviewEditedNames.get(s.index) ?? s.item.descricao,
        quantidadeTotal: s.item.quantidade,
        valorUnitario: s.item.valor_unitario,
        unidade: s.item.unidade,
        allocations: reviewAlmoxarifadoId
          ? [{ almoxarifadoId: reviewAlmoxarifadoId, quantidade: s.item.quantidade }]
          : [],
      }))

    setDistributions([...confirmedDist, ...skippedDist])
  }, [matchStates, reviewEditedNames, reviewAlmoxarifadoId])

  useEffect(() => {
    if (!reviewAlmoxarifadoId) return
    setDistributions((prev) => {
      if (prev.length === 0) return prev
      let changed = false
      const next = prev.map((d) => {
        if (
          d.allocations.length === 1 &&
          d.allocations[0].almoxarifadoId === reviewAlmoxarifadoId &&
          Math.abs(d.allocations[0].quantidade - d.quantidadeTotal) < 0.001
        ) {
          return d
        }
        changed = true
        return {
          ...d,
          allocations: [{ almoxarifadoId: reviewAlmoxarifadoId, quantidade: d.quantidadeTotal }],
        }
      })
      return changed ? next : prev
    })
  }, [reviewAlmoxarifadoId])

  const allDistributionsComplete = useMemo(
    () =>
      distributions.length === 0 ||
      distributions.every((d) => {
        const allocated = d.allocations.reduce((s, a) => s + (Number(a.quantidade) || 0), 0)
        return Math.abs(d.quantidadeTotal - allocated) < 0.001
      }),
    [distributions],
  )

  const addAllocation = useCallback((itemIndex: number) => {
    setDistributions((prev) =>
      prev.map((d) => {
        if (d.itemIndex !== itemIndex) return d
        const allocated = d.allocations.reduce((sum, a) => sum + (Number(a.quantidade) || 0), 0)
        const remaining = +(d.quantidadeTotal - allocated).toFixed(6)
        return {
          ...d,
          allocations: [
            ...d.allocations,
            { almoxarifadoId: '', quantidade: Math.max(0, remaining) },
          ],
        }
      }),
    )
  }, [])

  const removeAllocation = useCallback((itemIndex: number, allocIndex: number) => {
    setDistributions((prev) =>
      prev.map((d) =>
        d.itemIndex === itemIndex
          ? { ...d, allocations: d.allocations.filter((_, i) => i !== allocIndex) }
          : d,
      ),
    )
  }, [])

  const updateAllocation = useCallback(
    (
      itemIndex: number,
      allocIndex: number,
      field: 'almoxarifadoId' | 'quantidade',
      value: string | number,
    ) => {
      setDistributions((prev) =>
        prev.map((d) => {
          if (d.itemIndex !== itemIndex) return d
          if (field === 'quantidade') {
            const otherAllocated = d.allocations.reduce(
              (sum, a, i) => sum + (i === allocIndex ? 0 : Number(a.quantidade) || 0),
              0,
            )
            const clamped = Math.max(
              0,
              Math.min(Number(value), +(d.quantidadeTotal - otherAllocated).toFixed(6)),
            )
            return {
              ...d,
              allocations: d.allocations.map((a, i) =>
                i === allocIndex ? { ...a, quantidade: clamped } : a,
              ),
            }
          }
          return {
            ...d,
            allocations: d.allocations.map((a, i) =>
              i === allocIndex ? { ...a, almoxarifadoId: String(value) } : a,
            ),
          }
        }),
      )
    },
    [],
  )

  const resetDistributions = useCallback(() => {
    setDistributions([])
    setReviewAlmoxarifadoId(null)
  }, [])

  return {
    distributions,
    setDistributions,
    reviewAlmoxarifadoId,
    setReviewAlmoxarifadoId,
    buildDistributions,
    allDistributionsComplete,
    addAllocation,
    removeAllocation,
    updateAllocation,
    resetDistributions,
  }
}
