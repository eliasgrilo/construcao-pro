import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Notas Fiscais
// ═══════════════════════════════════════════════════════════

type NotaFiscalRow = Database['public']['Tables']['notas_fiscais']['Row']
type NotaFiscalItemCountRow = NotaFiscalRow & {
  itens_nf: Array<{ count: number | null }> | null
}
type NotaFiscalListItem = NotaFiscalRow & { _count: { itens: number } }

function mapNotaFiscal(row: NotaFiscalItemCountRow): NotaFiscalListItem {
  return {
    ...row,
    _count: { itens: row.itens_nf?.[0]?.count ?? 0 },
  }
}

export function useNotasFiscais() {
  return useQuery<NotaFiscalListItem[]>({
    queryKey: queryKeys.notasFiscais.all(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*, itens_nf(count)')
        .order('created_at', { ascending: false })
        .overrideTypes<NotaFiscalItemCountRow[]>()
      if (error) throw error
      return (data ?? []).map(mapNotaFiscal)
    },
  })
}

const NF_PAGE_SIZE = 25

export function useNotasFiscaisInfinite(opts?: { status?: string }) {
  const { status } = opts ?? {}
  return useInfiniteQuery<NotaFiscalListItem[], Error>({
    queryKey: ['notas-fiscais', 'infinite', status ?? ''],
    staleTime: 30_000,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < NF_PAGE_SIZE) return undefined
      return allPages.length * NF_PAGE_SIZE
    },
    queryFn: async ({ pageParam }) => {
      const from = pageParam as number
      const to = from + NF_PAGE_SIZE - 1
      let q = supabase
        .from('notas_fiscais')
        .select('*, itens_nf(count)')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (status && status !== 'all')
        q = q.eq('status', status as 'PENDENTE' | 'PROCESSADA' | 'VINCULADA' | 'REJEITADA')
      const { data, error } = await q.overrideTypes<NotaFiscalItemCountRow[]>()
      if (error) throw error
      return (data ?? []).map(mapNotaFiscal)
    },
  })
}

export function useNotaFiscalItens(nfId: string | null) {
  return useQuery({
    queryKey: queryKeys.notasFiscais.itens(nfId),
    enabled: !!nfId,
    queryFn: async () => {
      if (!nfId) return []
      const { data, error } = await supabase
        .from('itens_nf')
        .select('*')
        .eq('nf_id', nfId)
        .order('descricao')
      if (error) throw error
      return data || []
    },
  })
}

export function useDeleteNotaFiscal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A nota fiscal não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notasFiscais.all() })
    },
  })
}

export function useDeleteNotaFiscalOrchestrated() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      cancelFinanceiro,
    }: {
      id: string
      cancelFinanceiro?: boolean
    }) => {
      const { error } = await supabase.rpc('delete_nota_fiscal_orchestrated', {
        p_nf_id: id,
        p_cancel_financeiro: cancelFinanceiro ?? false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notasFiscais.all() })
      qc.invalidateQueries({ queryKey: queryKeys.notasFiscais.itens() })
      qc.invalidateQueries({ queryKey: queryKeys.contasPagar.all() })
      qc.invalidateQueries({ queryKey: queryKeys.estoque.all() })
      qc.invalidateQueries({ queryKey: queryKeys.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.materiais.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.movimentacoesRecentes() })
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'obra' && q.queryKey.length > 2,
      })
    },
  })
}
