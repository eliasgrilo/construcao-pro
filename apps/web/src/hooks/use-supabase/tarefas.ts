import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Tarefas (Checklist) — cloud-persisted
// ═══════════════════════════════════════════════════════════

export type Tarefa = {
  id: string
  user_id: string
  texto: string
  obra_id: string | null
  obra_nome: string | null
  concluida: boolean
  created_at: string
  updated_at: string
}

type TarefaRow = Database['public']['Tables']['tarefas']['Row']
type ObraManutencaoRow = Database['public']['Tables']['obra_manutencao']['Row']
type ObraManutencaoItemRow = Database['public']['Tables']['obra_manutencao_item']['Row']
type ObraStatus = Database['public']['Tables']['obras']['Row']['status']
type ObraSummaryRow = Pick<Database['public']['Tables']['obras']['Row'], 'id' | 'nome'>
type ObraSummaryWithStatusRow = Pick<
  Database['public']['Tables']['obras']['Row'],
  'id' | 'nome' | 'status'
>
type ObraManutencaoQueryRow = ObraManutencaoRow & {
  obra: ObraSummaryRow | null
  itens: ObraManutencaoItemRow[] | null
}
type ObraManutencaoDashboardRow = ObraManutencaoRow & {
  obra: ObraSummaryWithStatusRow | null
  itens: ObraManutencaoItemRow[] | null
}

function mapTarefa(row: TarefaRow): Tarefa {
  return row
}

function isObraStatus(value: string | null): value is ObraStatus {
  return (
    value === 'ATIVA' ||
    value === 'FINALIZADA' ||
    value === 'PAUSADA' ||
    value === 'VENDIDO' ||
    value === 'TERRENO' ||
    value === 'MANUTENCAO'
  )
}

export function useTarefas() {
  return useQuery<Tarefa[]>({
    queryKey: queryKeys.tarefas.all(),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tarefas').select('*').order('created_at', {
        ascending: false,
      })
      if (error) throw error
      return (data ?? []).map(mapTarefa)
    },
  })
}

export function useCreateTarefa() {
  const qc = useQueryClient()
  type Body = { texto: string; obra_id?: string | null; obra_nome?: string | null }
  type Ctx = { prev: Tarefa[] | undefined; optimisticId: string }
  return useMutation<Tarefa, Error, Body, Ctx>({
    mutationFn: async (body: Body) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { data, error } = await supabase
        .from('tarefas')
        .insert({ ...body, user_id: user.id, concluida: false })
        .select()
        .single()
      if (error) throw error
      return mapTarefa(data)
    },
    onMutate: async (body: Body) => {
      await qc.cancelQueries({ queryKey: queryKeys.tarefas.all() })
      const prev = qc.getQueryData<Tarefa[]>(queryKeys.tarefas.all())
      const optimisticId = generateId('tarefa')
      const optimistic: Tarefa = {
        id: optimisticId,
        user_id: '',
        texto: body.texto,
        obra_id: body.obra_id ?? null,
        obra_nome: body.obra_nome ?? null,
        concluida: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      qc.setQueryData<Tarefa[]>(queryKeys.tarefas.all(), (old) => [optimistic, ...(old ?? [])])
      return { prev, optimisticId }
    },
    onSuccess: (data, _vars, ctx) => {
      if (ctx?.optimisticId) {
        qc.setQueryData<Tarefa[]>(
          queryKeys.tarefas.all(),
          (old) => old?.map((t) => (t.id === ctx.optimisticId ? data : t)) ?? [],
        )
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.tarefas.all(), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tarefas.all() })
    },
  })
}

export function useUpdateTarefa() {
  const qc = useQueryClient()
  type Vars = { id: string } & Partial<Omit<Tarefa, 'id'>>
  type Ctx = { prev: Tarefa[] | undefined }
  return useMutation<Tarefa, Error, Vars, Ctx>({
    mutationFn: async ({ id, ...body }: Vars) => {
      const { data, error } = await supabase
        .from('tarefas')
        .update(body)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapTarefa(data)
    },
    onMutate: async (updated: Vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.tarefas.all() })
      const prev = qc.getQueryData<Tarefa[]>(queryKeys.tarefas.all())
      qc.setQueryData<Tarefa[]>(
        queryKeys.tarefas.all(),
        (old) => old?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)) ?? [],
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.tarefas.all(), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tarefas.all() })
    },
  })
}

export function useDeleteTarefa() {
  const qc = useQueryClient()
  type Ctx = { prev: Tarefa[] | undefined }
  return useMutation<void, Error, string, Ctx>({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A tarefa não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.tarefas.all() })
      const prev = qc.getQueryData<Tarefa[]>(queryKeys.tarefas.all())
      qc.setQueryData<Tarefa[]>(
        queryKeys.tarefas.all(),
        (old) => old?.filter((t) => t.id !== id) ?? [],
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.tarefas.all(), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tarefas.all() })
    },
  })
}

/* ════════════════════════════════════════════════════════════
   Manutenção de Obras
   ════════════════════════════════════════════════════════════ */

export interface ObraManutencao {
  id: string
  obra_id: string
  status: 'ativo' | 'concluido'
  status_anterior: string | null
  data_inicio: string
  data_conclusao: string | null
  created_at: string
  updated_at: string
  obra?: { id: string; nome: string }
  itens?: ObraManutencaoItem[]
}

export interface ObraManutencaoItem {
  id: string
  manutencao_id: string
  obra_id: string
  descricao: string
  resolvido: boolean
  created_at: string
  updated_at: string
}

type ManutencaoCacheValue = ObraManutencao | ObraManutencao[] | null | undefined

function mapManutencaoItem(row: ObraManutencaoItemRow): ObraManutencaoItem {
  return {
    id: row.id,
    manutencao_id: row.manutencao_id,
    obra_id: row.obra_id,
    descricao: row.descricao,
    resolvido: row.resolvido,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapManutencao(row: ObraManutencaoQueryRow): ObraManutencao {
  return {
    id: row.id,
    obra_id: row.obra_id,
    status: row.status as ObraManutencao['status'],
    status_anterior: row.status_anterior,
    data_inicio: row.data_inicio,
    data_conclusao: row.data_conclusao,
    created_at: row.created_at,
    updated_at: row.updated_at,
    obra: row.obra ?? undefined,
    itens: (row.itens ?? []).map(mapManutencaoItem),
  }
}

function patchManutencaoCacheItem(
  record: ObraManutencao,
  body: { id: string } & Partial<Omit<ObraManutencaoItem, 'id'>>,
): ObraManutencao {
  if (!record.itens) return record
  return {
    ...record,
    itens: record.itens.map((item) => (item.id === body.id ? { ...item, ...body } : item)),
  }
}

function invalidateManutencaoQueries(qc: ReturnType<typeof useQueryClient>, obraId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.obras.manutencao.all() })
  qc.invalidateQueries({ queryKey: queryKeys.obras.detail(obraId) })
  qc.invalidateQueries({ queryKey: queryKeys.obras.all() })
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.custoPorObra() })
}

/** Active maintenance session for a specific obra */
export function useObraManutencaoAtiva(obraId: string) {
  return useQuery<ObraManutencao | null>({
    queryKey: queryKeys.obras.manutencao.ativa(obraId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obra_manutencao')
        .select('*, obra:obras(id, nome), itens:obra_manutencao_item(*)')
        .eq('obra_id', obraId)
        .eq('status', 'ativo')
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle()
        .overrideTypes<ObraManutencaoQueryRow>()
      if (error) throw error
      return data ? mapManutencao(data) : null
    },
    enabled: !!obraId,
  })
}

/** All maintenance history for a specific obra */
export function useObraManutencoes(obraId: string) {
  return useQuery<ObraManutencao[]>({
    queryKey: queryKeys.obras.manutencao.historico(obraId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obra_manutencao')
        .select('*, itens:obra_manutencao_item(*)')
        .eq('obra_id', obraId)
        .order('data_inicio', { ascending: false })
        .overrideTypes<ObraManutencaoQueryRow[]>()
      if (error) throw error
      return (data ?? []).map(mapManutencao)
    },
    enabled: !!obraId,
  })
}

/** All active maintenance sessions across all obras (for dashboard) */
export function useAllManutencaoAtiva() {
  return useQuery<ObraManutencao[]>({
    queryKey: queryKeys.obras.manutencao.todasAtivas(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obra_manutencao')
        .select('*, obra:obras(id, nome, status), itens:obra_manutencao_item(*)')
        .eq('status', 'ativo')
        .order('data_inicio', { ascending: true })
        .overrideTypes<ObraManutencaoDashboardRow[]>()
      if (error) throw error
      return (data ?? []).map((row) => mapManutencao(row))
    },
    staleTime: 30_000,
  })
}

/** Start a new maintenance session */
export function useCreateManutencao() {
  const qc = useQueryClient()
  type CreateManutencaoBody = {
    obra_id: string
    status_anterior?: string
    problemas?: string[]
  }

  return useMutation<ObraManutencao, Error, CreateManutencaoBody>({
    mutationFn: async (body: CreateManutencaoBody) => {
      // Filter blank strings so the SQL receives only real problem descriptions
      const problemas = (body.problemas ?? []).filter((p) => p.trim() !== '')

      // Omit p_problemas entirely when there are none so PostgreSQL uses the
      // function default — avoids sending null/empty-array which some versions
      // of the pg driver reject for TEXT[] parameters.
      const { data, error } = await supabase.rpc('start_obra_manutencao', {
        p_obra_id: body.obra_id,
        p_status_anterior: body.status_anterior ?? null,
        p_problemas: problemas.length > 0 ? problemas : undefined,
      })

      if (error) {
        // PostgrestError is not an instance of Error — convert so callers get
        // the real DB message instead of a generic fallback.
        throw new Error(error.message ?? 'Erro desconhecido ao iniciar manutenção')
      }

      // Supabase JS may return the composite-type row as an array of 1 element
      // or as a plain object depending on the client version.
      const raw = Array.isArray(data as unknown) ? (data as unknown as unknown[])[0] : data
      if (!raw) throw new Error('Nenhum dado retornado pelo servidor')

      const record = raw as unknown as ObraManutencao
      return {
        ...record,
        status: record.status as ObraManutencao['status'],
      }
    },
    onSuccess: (_data, vars) => {
      invalidateManutencaoQueries(qc, vars.obra_id)
    },
  })
}

/** Conclude (resolve) a maintenance session — also reverts obra status to pre-maintenance value */
export function useConcluirManutencao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { id: string; obra_id: string }) => {
      // Fetch status_anterior before concluding
      const { data: manut, error: manutErr } = await supabase
        .from('obra_manutencao')
        .select('status_anterior')
        .eq('id', body.id)
        .single()
      if (manutErr) throw manutErr

      // Conclude the session
      const { data, error } = await supabase
        .from('obra_manutencao')
        .update({ status: 'concluido', data_conclusao: new Date().toISOString() })
        .eq('id', body.id)
        .select()
        .single()
      if (error) throw error

      // Revert obra status to whatever it was before entering maintenance
      const statusAnterior = isObraStatus(manut?.status_anterior) ? manut.status_anterior : 'ATIVA'
      const { error: revertErr } = await supabase
        .from('obras')
        .update({ status: statusAnterior })
        .eq('id', body.obra_id)
      if (revertErr) throw revertErr

      return {
        ...data,
        status: data.status as ObraManutencao['status'],
      }
    },
    onSuccess: (_data: ObraManutencao, vars: { id: string; obra_id: string }) => {
      invalidateManutencaoQueries(qc, vars.obra_id)
    },
  })
}

/** Add a problem/item to a maintenance session */
export function useCreateManutencaoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      manutencao_id: string
      obra_id: string
      descricao: string
      prioridade?: string
      responsavel?: string
      data_prevista?: string
      observacoes?: string
      categoria?: string
    }) => {
      const { data, error } = await supabase
        .from('obra_manutencao_item')
        .insert({
          manutencao_id: body.manutencao_id,
          obra_id: body.obra_id,
          descricao: body.descricao,
          prioridade: body.prioridade || null,
          responsavel: body.responsavel || null,
          data_prevista: body.data_prevista || null,
          observacoes: body.observacoes || null,
          categoria: body.categoria || null,
        })
        .select()
        .single()
      if (error) throw error
      return mapManutencaoItem(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.obras.manutencao.all() })
    },
  })
}

/** Update a maintenance item (edit description or toggle resolved) */
export function useUpdateManutencaoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      id: string
      descricao?: string
      resolvido?: boolean
      prioridade?: string | null
      responsavel?: string | null
      data_prevista?: string | null
      data_conclusao?: string | null
      observacoes?: string | null
      categoria?: string | null
    }) => {
      const { id, ...rest } = body
      const { data, error } = await supabase
        .from('obra_manutencao_item')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapManutencaoItem(data)
    },
    onMutate: async (body) => {
      // Cancel in-flight refetches to avoid overwriting optimistic update
      await qc.cancelQueries({ queryKey: queryKeys.obras.manutencao.all() })

      // Snapshot current cache across all obra_manutencao queries for rollback
      const snapshots = qc.getQueriesData<ManutencaoCacheValue>({
        queryKey: queryKeys.obras.manutencao.all(),
      })

      // Apply optimistic update to every matching cache entry
      qc.setQueriesData<ManutencaoCacheValue>(
        { queryKey: queryKeys.obras.manutencao.all() },
        (old) => {
          if (!old) return old
          if (Array.isArray(old)) return old.map((record) => patchManutencaoCacheItem(record, body))
          return patchManutencaoCacheItem(old, body)
        },
      )

      return { snapshots }
    },
    onError: (_err, _body, ctx) => {
      // Rollback all patched caches on error
      if (ctx?.snapshots) {
        for (const [queryKey, data] of ctx.snapshots) {
          qc.setQueryData(queryKey, data)
        }
      }
    },
    onSettled: () => {
      // Re-sync with server after success or error
      qc.invalidateQueries({ queryKey: queryKeys.obras.manutencao.all() })
    },
  })
}

/** Delete a maintenance item */
export function useDeleteManutencaoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('obra_manutencao_item')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('O item de manutenção não pôde ser excluído. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.obras.manutencao.all() })
    },
  })
}
