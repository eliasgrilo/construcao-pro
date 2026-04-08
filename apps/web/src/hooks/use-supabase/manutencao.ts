import { supabase } from '@/lib/supabase'
import { normalizeTimestamp } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Estoque Hub — Material Entry History & Price Analytics
// ═══════════════════════════════════════════════════════════

export interface MaterialEntradaRow {
  id: string
  quantidade: number
  preco_unitario: number | null
  created_at: string
  forma_pagamento: string | null
  observacao: string | null
  unidade: string | null
  fornecedor: { id: string; nome: string } | null
  almoxarifado: {
    id: string
    nome: string
    obra: { id: string; nome: string } | null
  } | null
}

/** Fetch all ENTRADA movimentações for a specific material — price history hub */
export function useMaterialEntradas(materialId: string | null) {
  return useQuery({
    queryKey: ['material', materialId, 'entradas'],
    staleTime: 30_000, // 30s
    enabled: !!materialId,
    queryFn: async () => {
      if (!materialId) return []
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          id, quantidade, preco_unitario, created_at, forma_pagamento, observacao, unidade,
          fornecedor:fornecedores(id, nome),
          almoxarifado:almoxarifados!almoxarifado_id(id, nome, obra:obras(id, nome))
        `)
        .eq('material_id', materialId)
        .eq('tipo', 'ENTRADA')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as MaterialEntradaRow[]
    },
  })
}

export interface MaterialCostTrendPoint {
  month: string
  label: string
  total: number
  count: number
}

/** Aggregate material purchase costs by month for the last 6 months */
export function useMaterialCostTrend(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['estoque', 'cost-trend'],
    staleTime: 1000 * 60, // 1 min
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const { data, error } = await supabase
        .from('movimentacoes')
        .select('quantidade, preco_unitario, created_at')
        .eq('tipo', 'ENTRADA')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })
      if (error) throw error

      const monthMap = new Map<string, { total: number; count: number }>()
      for (const row of data || []) {
        const d = new Date(normalizeTimestamp(row.created_at))
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const prev = monthMap.get(key) || { total: 0, count: 0 }
        monthMap.set(key, {
          total: prev.total + (row.quantidade || 0) * (row.preco_unitario || 0),
          count: prev.count + 1,
        })
      }

      const months = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      const result: MaterialCostTrendPoint[] = []
      for (const [key, val] of monthMap.entries()) {
        const [, m] = key.split('-')
        result.push({
          month: key,
          label: months[Number(m) - 1],
          total: val.total,
          count: val.count,
        })
      }
      return result.sort((a, b) => a.month.localeCompare(b.month))
    },
  })
}

export interface SupplierPriceRankingItem {
  fornecedorId: string
  fornecedorNome: string
  materialId: string
  materialNome: string
  categoriaNome: string
  avgPrice: number
  marketAvg: number
  diff: number
  diffPercent: number
  entryCount: number
}

type SupplierRankingMaterialRow = {
  id: string
  nome: string
  categoria: { id: string; nome: string } | null
}
type SupplierRankingQueryRow = {
  quantidade: number
  preco_unitario: number | null
  fornecedor_id: string | null
  fornecedor: { id: string; nome: string } | null
  material: SupplierRankingMaterialRow | null
}

/** Supplier price ranking — who's selling more expensive vs. market average */
export function useSupplierPriceRanking(options?: { enabled?: boolean }) {
  return useQuery<SupplierPriceRankingItem[]>({
    queryKey: ['fornecedores', 'price-ranking'],
    staleTime: 1000 * 60, // 1 min
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          quantidade, preco_unitario, fornecedor_id,
          fornecedor:fornecedores(id, nome),
          material:materiais(id, nome, categoria:categorias(id, nome))
        `)
        .eq('tipo', 'ENTRADA')
        .not('fornecedor_id', 'is', null)
        .not('preco_unitario', 'is', null)
        .overrideTypes<SupplierRankingQueryRow[]>()
      if (error) throw error

      // Group by material to compute market average
      const materialPrices = new Map<
        string,
        { sum: number; count: number; nome: string; categoriaNome: string }
      >()
      // Group by fornecedor+material for supplier-specific average
      const supplierPrices = new Map<
        string,
        {
          fornecedorId: string
          fornecedorNome: string
          materialId: string
          materialNome: string
          categoriaNome: string
          sum: number
          count: number
        }
      >()

      for (const row of data || []) {
        const matId = row.material?.id
        const fornId = row.fornecedor?.id
        if (!matId || !fornId || !row.preco_unitario) continue

        const matNome = row.material?.nome || '—'
        const catNome = row.material?.categoria?.nome || '—'

        // Market totals
        const mkt = materialPrices.get(matId) || {
          sum: 0,
          count: 0,
          nome: matNome,
          categoriaNome: catNome,
        }
        materialPrices.set(matId, {
          ...mkt,
          sum: mkt.sum + row.preco_unitario,
          count: mkt.count + 1,
        })

        // Supplier-material totals
        const key = `${fornId}__${matId}`
        const sp = supplierPrices.get(key) || {
          fornecedorId: fornId,
          fornecedorNome: row.fornecedor?.nome || '—',
          materialId: matId,
          materialNome: matNome,
          categoriaNome: catNome,
          sum: 0,
          count: 0,
        }
        supplierPrices.set(key, { ...sp, sum: sp.sum + row.preco_unitario, count: sp.count + 1 })
      }

      const ranking: SupplierPriceRankingItem[] = []
      for (const sp of supplierPrices.values()) {
        const mkt = materialPrices.get(sp.materialId)
        if (!mkt || mkt.count < 2) continue // Need at least 2 entries for meaningful comparison
        const avgPrice = sp.sum / sp.count
        const marketAvg = mkt.sum / mkt.count
        const diff = avgPrice - marketAvg
        const diffPercent = marketAvg > 0 ? (diff / marketAvg) * 100 : 0
        ranking.push({
          fornecedorId: sp.fornecedorId,
          fornecedorNome: sp.fornecedorNome,
          materialId: sp.materialId,
          materialNome: sp.materialNome,
          categoriaNome: sp.categoriaNome,
          avgPrice,
          marketAvg,
          diff,
          diffPercent,
          entryCount: sp.count,
        })
      }
      return ranking.sort((a, b) => b.diffPercent - a.diffPercent)
    },
  })
}
