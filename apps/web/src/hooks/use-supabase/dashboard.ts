import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    staleTime: 1000 * 60, // 1 min — computed aggregates, refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats')
      if (error) throw error
      return data as {
        obrasAtivas: number
        totalObras: number
        totalMateriais: number
        totalMovimentacoes: number
        totalNFs: number
        alertasEstoque: number
        custoTotal: number
        orcamentoTotal: number
      }
    },
  })
}

export function useDashboardCustoPorObra() {
  return useQuery({
    queryKey: queryKeys.dashboard.custoPorObra(),
    staleTime: 1000 * 60, // 1 min — computed aggregates, refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_custo_por_obra')
      if (error) throw error
      return (data || []) as {
        id: string
        obra: string
        endereco: string
        status: string
        custo: number
        orcamento: number
        valor_terreno: number
        valor_burocracia: number
        valor_construcao: number
        valor_venda: number
        percentual: number
      }[]
    },
  })
}

export function useMovimentacoesRecentes(limit = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.movimentacoesRecentes(limit),
    staleTime: 30_000, // 30s — dashboard data should be fresh
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          id, tipo, quantidade, preco_unitario, forma_pagamento, created_at,
          material:materiais(nome),
          almoxarifado:almoxarifados!almoxarifado_id(nome, obra:obras(nome, endereco)),
          nf:notas_fiscais(numero, contas_pagar(contas_pagar_parcelas(numero_parcela, total_parcelas)))
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data || []) as Record<string, unknown>[]
    },
  })
}

export function useEstoqueAlertas() {
  return useQuery({
    queryKey: queryKeys.estoque.alertas(),
    staleTime: 1000 * 60, // 1 min — alerts refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_estoque_alertas')
      if (error) throw error
      return (data || []) as Record<string, unknown>[]
    },
  })
}
