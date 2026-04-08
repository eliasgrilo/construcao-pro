import { useMemo } from 'react'
import type { FilterId, ItemMatchState, NFRow } from '../notas-fiscais-types'
import { formatCNPJ, formatMonthYear, monthKey } from '../notas-fiscais-utils'

type Params = {
  nfs: NFRow[]
  activeFilter: FilterId
  searchQuery: string
  matchStates: ItemMatchState[]
}

export function useNotasFiscaisListData({ nfs, activeFilter, searchQuery, matchStates }: Params) {
  const stats = useMemo(
    () => ({
      total: nfs.length,
      valorTotal: nfs.reduce((s, n) => s + (n.valor_total || 0), 0),
      pendentes: nfs.filter((n) => n.status === 'PENDENTE').length,
      processadas: nfs.filter((n) => n.status === 'PROCESSADA').length,
      vinculadas: nfs.filter((n) => n.status === 'VINCULADA').length,
      rejeitadas: nfs.filter((n) => n.status === 'REJEITADA').length,
    }),
    [nfs],
  )

  const matchSummary = useMemo(() => {
    if (!matchStates.length) return null
    const total = matchStates.length
    const confirmed = matchStates.filter((s) => s.matchStatus === 'confirmed').length
    const skipped = matchStates.filter((s) => s.matchStatus === 'skipped').length
    const pending = matchStates.filter(
      (s) => s.matchStatus === 'pending' || s.matchStatus === 'analyzing',
    ).length
    const allResolved = pending === 0
    return { total, confirmed, skipped, pending, allResolved }
  }, [matchStates])

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: Array.isArray(nfs) ? nfs.length : 0 }
    for (const nf of nfs) {
      if (nf?.status) counts[nf.status] = (counts[nf.status] ?? 0) + 1
    }
    return counts
  }, [nfs])

  const nfsByMonth = useMemo(() => {
    let filtered = nfs
    if (activeFilter !== 'all') filtered = filtered.filter((n) => n.status === activeFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const qd = q.replace(/\D/g, '')
      filtered = filtered.filter((n) => {
        const cnpjClean = n.cnpj_emitente.replace(/\D/g, '')
        return (
          n.numero.padStart(6, '0').includes(q) ||
          n.numero.includes(q) ||
          (qd.length >= 3 && cnpjClean.includes(qd)) ||
          formatCNPJ(n.cnpj_emitente).toLowerCase().includes(q) ||
          n.nome_emitente?.toLowerCase().includes(q)
        )
      })
    }
    const groups: Record<string, { label: string; key: string; nfs: NFRow[]; total: number }> = {}
    for (const nf of filtered) {
      if (!nf?.data_emissao) continue
      const key = monthKey(nf.data_emissao)
      const label = formatMonthYear(nf.data_emissao)
      if (!groups[key]) groups[key] = { label, key, nfs: [], total: 0 }
      groups[key].nfs.push(nf)
      groups[key].total += nf.valor_total || 0
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, value]) => ({
        ...value,
        nfs: value.nfs
          .slice()
          .sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()),
      }))
  }, [nfs, activeFilter, searchQuery])

  return { filterCounts, matchSummary, nfsByMonth, stats }
}
