import { getRelationCount } from '@/hooks/use-supabase/shared'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Obras
// ═══════════════════════════════════════════════════════════

export interface ObraRow {
  id: string
  nome: string
  endereco: string
  status: string
  orcamento: number
  valor_terreno: number | null
  valor_burocracia: number | null
  valor_construcao: number | null
  valor_venda: number | null
  created_at: string
  updated_at: string
  _count: { almoxarifados: number }
}

type ObraTableRow = Database['public']['Tables']['obras']['Row']
type ObraWithCountRow = ObraTableRow & {
  almoxarifados: Array<{ count: number | null }> | null
}

function mapObra(row: ObraWithCountRow): ObraRow {
  return {
    ...row,
    _count: { almoxarifados: getRelationCount(row.almoxarifados) },
  }
}

function invalidateObraMutationQueries(
  qc: ReturnType<typeof useQueryClient>,
  obraId?: string | null,
) {
  if (obraId) {
    qc.invalidateQueries({ queryKey: queryKeys.obras.detail(obraId) })
    qc.invalidateQueries({ queryKey: queryKeys.almoxarifados.byObra(obraId) })
    qc.invalidateQueries({ queryKey: queryKeys.obras.custos(obraId) })
  }
  qc.invalidateQueries({ queryKey: queryKeys.obras.all() })
  qc.invalidateQueries({ queryKey: queryKeys.almoxarifados.all() })
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
}

export function useObras() {
  return useQuery<ObraRow[]>({
    queryKey: queryKeys.obras.all(),
    staleTime: 30_000, // 30s — frequently-accessed list, refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('*, almoxarifados(count)')
        .order('created_at', { ascending: false })
        .overrideTypes<ObraWithCountRow[]>()
      if (error) throw error
      return (data ?? []).map(mapObra)
    },
  })
}

export function useObra(obraId: string) {
  return useQuery({
    queryKey: queryKeys.obras.detail(obraId),
    staleTime: 30_000, // 30 s — avoid redundant fetches on back/forward nav
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('*').eq('id', obraId).single()
      if (error) throw error
      return data
    },
    enabled: !!obraId,
  })
}

export function useCreateObra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      nome: string
      endereco: string
      status?: 'ATIVA' | 'PAUSADA' | 'FINALIZADA' | 'VENDIDO' | 'TERRENO'
      orcamento?: number
      valorTerreno?: number
      valorBurocracia?: number
      valorConstrucao?: number
      data_inicio?: string
      data_previsao_termino?: string
      responsavel?: string
      cliente?: string
      area_total?: number
      observacoes?: string
    }) => {
      const { data, error } = await supabase.rpc('create_obra_with_almoxarifado', {
        p_nome: body.nome,
        p_endereco: body.endereco,
        p_status: body.status || 'ATIVA',
        p_orcamento: body.orcamento || 0,
        p_valor_terreno: body.valorTerreno || 0,
        p_valor_burocracia: body.valorBurocracia || 0,
        p_valor_construcao: body.valorConstrucao || 0,
        p_data_inicio: body.data_inicio || null,
        p_data_previsao_termino: body.data_previsao_termino || null,
        p_responsavel: body.responsavel || null,
        p_cliente: body.cliente || null,
        p_area_total: body.area_total || null,
        p_observacoes: body.observacoes || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      invalidateObraMutationQueries(qc, data?.id ?? null)
    },
  })
}

export function useUpdateObra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      nome?: string
      endereco?: string
      status?: Database['public']['Tables']['obras']['Row']['status']
      orcamento?: number
      valor_terreno?: number
      valor_burocracia?: number
      valor_construcao?: number
      valor_venda?: number
      data_inicio?: string | null
      data_previsao_termino?: string | null
      responsavel?: string | null
      cliente?: string | null
      area_total?: number | null
      observacoes?: string | null
    }) => {
      const { data, error } = await supabase
        .from('obras')
        .update(body)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      invalidateObraMutationQueries(qc, vars.id)
    },
  })
}

export function useRegisterObraVenda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      obra_id: string
      valor_venda: number
      movements: Array<{
        conta_id: string
        tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
        subconta: 'CAIXA' | 'APLICADO'
        motivo: string
        valor: number
        data: string
        delta_caixa: number
        delta_aplicado: number
        destino_conta_id?: string | null
        delta_destino_caixa?: number
        transferencia_destino_id?: string | null
      }>
      receivables: Array<{
        descricao: string
        cliente: string | null
        obra_id: string | null
        observacoes: string | null
        valor_total: number
        parcelas: Array<{
          numero_parcela: number
          total_parcelas: number
          valor: number
          vencimento: string
        }>
      }>
    }) => {
      try {
        const { data, error } = await supabase.rpc('register_obra_sale', {
          p_obra_id: body.obra_id,
          p_valor_venda: body.valor_venda,
          p_movements: body.movements,
          p_receivables: body.receivables,
        })
        if (error) {
          throw new Error(
            error.message ||
              (error as { details?: string }).details ||
              (error as { hint?: string }).hint ||
              'Erro desconhecido ao registrar venda',
          )
        }
        return data
      } catch (e) {
        if (e instanceof Error) throw e
        throw new Error(typeof e === 'string' && e ? e : 'Falha de rede ao registrar venda')
      }
    },
    onSuccess: (_data, vars) => {
      invalidateObraMutationQueries(qc, vars.obra_id)
      for (const movement of vars.movements) {
        qc.invalidateQueries({
          queryKey: queryKeys.financeiro.movimentacoes.byConta(movement.conta_id),
        })
        if (movement.destino_conta_id) {
          qc.invalidateQueries({
            queryKey: queryKeys.financeiro.movimentacoes.byConta(movement.destino_conta_id),
          })
        }
      }
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.all() })
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.parcelas() })
    },
  })
}

export function useCancelObraVenda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ obra_id, new_status }: { obra_id: string; new_status: string }) => {
      const { data, error } = await supabase.rpc('cancel_obra_sale', {
        p_obra_id: obra_id,
        p_new_status: new_status,
      })
      if (error) {
        throw new Error(
          error.message || (error as { details?: string }).details || 'Erro ao cancelar venda',
        )
      }
      return data
    },
    onSuccess: (_data, vars) => {
      invalidateObraMutationQueries(qc, vars.obra_id)
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.all() })
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.parcelas() })
    },
  })
}

export function useDeleteObra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A obra não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.obras.all() })
      qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'obra',
      })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Obra Custos
// ═══════════════════════════════════════════════════════════

export function useObraCustos(obraId: string) {
  return useQuery({
    queryKey: queryKeys.obras.custos(obraId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_obra_custos', { p_obra_id: obraId })
      if (error) throw error
      return data as {
        orcamento: number
        valorTerreno: number
        valorBurocracia: number
        valorConstrucao: number
        total: number
        valorVenda: number
        saldo: number
        percentual: number
        tendencia: Array<{ mes: string; valor: number }>
        porCategoria: Array<{ categoria: string; valor: number }>
      }
    },
    staleTime: 30_000,
    enabled: !!obraId,
  })
}

// ═══════════════════════════════════════════════════════════
// Almoxarifados
// ═══════════════════════════════════════════════════════════

export interface AlmoxarifadoRow {
  id: string
  nome: string
  obra_id: string | null
  created_at: string
  updated_at: string
  obra?: { id: string; nome: string } | null
}

export function useAlmoxarifados() {
  return useQuery({
    queryKey: ['almoxarifados'],
    staleTime: 30_000, // 30 s — match obra-specific variant
    queryFn: async () => {
      const { data, error } = await supabase
        .from('almoxarifados')
        .select('*, obra:obras(id, nome)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as AlmoxarifadoRow[]
    },
  })
}

export function useObraAlmoxarifados(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId, 'almoxarifados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('almoxarifados')
        .select('*, obra:obras(id, nome)')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as AlmoxarifadoRow[]
    },
    staleTime: 30_000,
    enabled: !!obraId,
  })
}

export function useCreateAlmoxarifado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { nome: string; obra_id: string }) => {
      const { data, error } = await supabase.from('almoxarifados').insert(body).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      invalidateObraMutationQueries(qc, vars.obra_id)
    },
  })
}

export function useDeleteAlmoxarifado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('almoxarifados')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('O almoxarifado não pôde ser excluído. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['almoxarifados'] })
      qc.invalidateQueries({ queryKey: ['obras'] })
      // Invalidate obra sub-queries (custos, almoxarifados) without cascading entire ['obra'] tree
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'obra' && q.queryKey.length > 2,
      })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
    },
  })
}
