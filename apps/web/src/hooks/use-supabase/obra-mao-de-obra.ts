import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type ObraLancamentoMaoDeObra =
  Database['public']['Tables']['obra_lancamentos_mao_de_obra']['Row']

export type CreateObraLancamentoMaoDeObra =
  Database['public']['Tables']['obra_lancamentos_mao_de_obra']['Insert']

export function useObraLancamentosMaoDeObra(obraId: string) {
  return useQuery({
    queryKey: queryKeys.obras.maoDeObra(obraId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obra_lancamentos_mao_de_obra')
        .select('*')
        .eq('obra_id', obraId)
        .order('data', { ascending: false })
      if (error) throw error
      return (data || []) as ObraLancamentoMaoDeObra[]
    },
    enabled: !!obraId,
  })
}

export function useCreateObraLancamentoMaoDeObra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateObraLancamentoMaoDeObra) => {
      const { error } = await supabase.from('obra_lancamentos_mao_de_obra').insert(payload)
      if (error) throw error
      return payload
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.maoDeObra(variables.obra_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.custos(variables.obra_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
    },
  })
}

export function useDeleteObraLancamentoMaoDeObra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, obraId }: { id: string; obraId: string }) => {
      const { data, error } = await supabase
        .from('obra_lancamentos_mao_de_obra')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('O lançamento não pôde ser excluído. Verifique suas permissões.')
      }
      return { id, obraId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.maoDeObra(result.obraId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.custos(result.obraId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
    },
  })
}
