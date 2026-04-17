import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type ObraLancamentoMaoDeObra =
  Database['public']['Tables']['obra_lancamentos_mao_de_obra']['Row']

export interface CreateObraLancamentoMaoDeObraInput {
  obra_id: string
  almoxarifado_id?: string | null
  descricao: string
  valor: number
  data?: string
  forma_pagamento?: string | null
  conta_id?: string | null
  subconta?: 'CAIXA' | 'APLICADO' | null
  prestador?: string | null
  observacao?: string | null
}

type ObraMaoDeObraRpcClient = {
  rpc<TResult>(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: TResult | null; error: Error | null }>
}

// The DB migration adds these RPCs before the next Supabase type generation happens.
const obraMaoDeObraRpc = supabase as unknown as ObraMaoDeObraRpcClient

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
    mutationFn: async (payload: CreateObraLancamentoMaoDeObraInput) => {
      const { data, error } = await obraMaoDeObraRpc.rpc<{ id: string }>(
        'create_obra_lancamento_mao_de_obra',
        {
          p_obra_id: payload.obra_id,
          p_almoxarifado_id: payload.almoxarifado_id ?? null,
          p_descricao: payload.descricao,
          p_valor: payload.valor,
          p_data: payload.data ?? null,
          p_forma_pagamento: payload.forma_pagamento ?? null,
          p_conta_id: payload.conta_id ?? null,
          p_subconta: payload.subconta ?? null,
          p_prestador: payload.prestador ?? null,
          p_observacao: payload.observacao ?? null,
        },
      )
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.maoDeObra(variables.obra_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.custos(variables.obra_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      queryClient.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      if (variables.conta_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.financeiro.movimentacoes.byConta(variables.conta_id),
        })
      }
    },
  })
}

export function useDeleteObraLancamentoMaoDeObra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, obraId }: { id: string; obraId: string }) => {
      const { data, error } = await obraMaoDeObraRpc.rpc<{ id: string }>(
        'delete_obra_lancamento_mao_de_obra',
        {
          p_id: id,
          p_obra_id: obraId,
        },
      )
      if (error) throw error
      const deletedId = data?.id
      if (!deletedId) {
        throw new Error('O lançamento não pôde ser excluído. Verifique suas permissões.')
      }
      return { id: deletedId, obraId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.maoDeObra(result.obraId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.obras.custos(result.obraId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      queryClient.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
    },
  })
}
