import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ObraLancamentoMaoDeObra {
  id: string
  obra_id: string
  almoxarifado_id: string | null
  descricao: string
  valor: number
  data: string
  forma_pagamento: string | null
  conta_id: string | null
  prestador: string | null
  observacao: string | null
  created_at: string
}

export type CreateObraLancamentoMaoDeObra = Omit<ObraLancamentoMaoDeObra, 'id' | 'created_at'>

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
      const { data, error } = await supabase
        .from('obra_lancamentos_mao_de_obra')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as ObraLancamentoMaoDeObra
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
