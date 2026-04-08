import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Obra Lançamentos Burocracia
// ═══════════════════════════════════════════════════════════

export interface ObraLancamentoBurocracia {
  id: string
  obra_id: string
  categoria: 'banco' | 'vendas' | 'impostos' | 'taxas'
  descricao: string
  valor: number
  data: string
  created_at: string
}

export function useObraLancamentosBurocracia(obraId: string) {
  return useQuery({
    queryKey: ['obra-lancamentos-burocracia', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obra_lancamentos_burocracia')
        .select('*')
        .eq('obra_id', obraId)
        .order('data', { ascending: false })
      if (error) throw error
      return (data || []) as ObraLancamentoBurocracia[]
    },
    enabled: !!obraId,
  })
}

export function useCreateObraLancamentoBurocracia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<ObraLancamentoBurocracia, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('obra_lancamentos_burocracia')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['obra-lancamentos-burocracia', variables.obra_id],
      })
      queryClient.invalidateQueries({ queryKey: ['obra', variables.obra_id, 'custos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })
    },
  })
}

export function useDeleteObraLancamentoBurocracia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, obraId }: { id: string; obraId: string }) => {
      const { data, error } = await supabase
        .from('obra_lancamentos_burocracia')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('O lancamento não pôde ser excluído. Verifique suas permissões.')
      }
      return { id, obraId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['obra-lancamentos-burocracia', result.obraId] })
      queryClient.invalidateQueries({ queryKey: ['obra', result.obraId, 'custos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })
    },
  })
}
