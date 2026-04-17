import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Financeiro — Contas e Movimentações (Supabase, cross-device)
// ═══════════════════════════════════════════════════════════

export interface FinanceiroConta {
  id: string
  banco: string
  agencia: string
  numero_conta: string
  valor_caixa: number
  valor_aplicado: number
  created_at: string
  updated_at: string
}

export interface FinanceiroMovimentacao {
  id: string
  conta_id: string
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
  subconta: 'CAIXA' | 'APLICADO'
  motivo: string
  valor: number
  data: string
  transferencia_destino_id: string | null
  created_at: string
}

export interface FinanceiroMovimentacaoWithConta extends FinanceiroMovimentacao {
  financeiro_contas?: FinanceiroConta | null
}

type FinanceiroContaTable = Database['public']['Tables']['financeiro_contas']
type FinanceiroContaRow = FinanceiroContaTable['Row']
type FinanceiroMetaRow = Database['public']['Tables']['financeiro_meta']['Row']

/* ── Contas ── */

export function useFinanceiroContas() {
  return useQuery<FinanceiroConta[]>({
    queryKey: queryKeys.financeiro.contas(),
    staleTime: 30_000, // 30s — refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_contas')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as FinanceiroConta[]
    },
  })
}

export function useCreateFinanceiroConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Database['public']['Tables']['financeiro_contas']['Insert']) => {
      const { data, error } = await supabase
        .from('financeiro_contas')
        .insert(body)
        .select()
        .single()
      if (error) throw error
      return data as FinanceiroConta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() }),
  })
}

export function useUpdateFinanceiroConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: FinanceiroContaTable['Update'] & { id: string }) => {
      const { data, error } = await supabase
        .from('financeiro_contas')
        .update(body)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as FinanceiroConta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() }),
  })
}

export function useDeleteFinanceiroConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('financeiro_contas')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A conta não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      // Parcelas that referenced this account via conta_bancaria_id may now
      // show a stale/orphaned account reference — refresh both payable/receivable caches.
      qc.invalidateQueries({ queryKey: queryKeys.contasPagar.all() })
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.all() })
    },
  })
}

/* ── Movimentações ── */

export function useFinanceiroMovimentacoes(contaId: string) {
  return useQuery<FinanceiroMovimentacao[]>({
    queryKey: queryKeys.financeiro.movimentacoes.byConta(contaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_movimentacoes')
        .select('*')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as unknown as FinanceiroMovimentacao[]
    },
    enabled: !!contaId,
  })
}

export function useCreateFinanceiroMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (body) => {
      const queryKey = queryKeys.financeiro.movimentacoes.byConta(body.conta_id)
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<FinanceiroMovimentacao[]>(queryKey)

      // Optimistically prepend a temp movimentação (no id yet)
      const tempMov: FinanceiroMovimentacao = {
        id: `__optimistic__${Date.now()}`,
        conta_id: body.conta_id,
        tipo: body.tipo,
        subconta: body.subconta,
        motivo: body.motivo,
        valor: body.valor,
        data: body.data,
        transferencia_destino_id: body.transferencia_destino_id ?? null,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<FinanceiroMovimentacao[]>(queryKey, (old) => [tempMov, ...(old ?? [])])

      return { prev, queryKey }
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(ctx.queryKey, ctx.prev)
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.byConta(vars.conta_id) })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
    },
    mutationFn: async (body: {
      conta_id: string
      tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
      subconta: 'CAIXA' | 'APLICADO'
      motivo: string
      valor: number
      data: string
      transferencia_destino_id?: string | null
    }) => {
      const { data, error } = await supabase
        .from('financeiro_movimentacoes')
        .insert(body)
        .select()
        .single()
      if (error) throw error
      return data as unknown as FinanceiroMovimentacao
    },
  })
}

/**
 * Atomically registers a financeiro movement AND updates the account balance
 * in a single DB transaction (no read-then-write race condition).
 *
 * The caller computes signed deltas:
 *   ENTRADA  CAIXA    → delta_caixa=+v, delta_aplicado=0
 *   SAIDA    CAIXA    → delta_caixa=-v, delta_aplicado=0
 *   ENTRADA  APLICADO → delta_caixa=0,  delta_aplicado=+v
 *   SAIDA    APLICADO → delta_caixa=0,  delta_aplicado=-v
 *   INTERNAL CAIXA↔AP → delta_caixa=-v, delta_aplicado=+v
 *   TRANSFER other    → delta_caixa=-v (or -ap), destino_conta_id+delta_destino_caixa=+v
 */
export function useRegisterFinanceiroMovement() {
  const qc = useQueryClient()
  return useMutation({
    // ── Optimistic update ──────────────────────────────────────────────────
    // Prepend a provisional movement immediately so the UI responds in 0ms.
    // On error the snapshot is restored; on settle the real server row replaces it.
    onMutate: async (body) => {
      const queryKey = queryKeys.financeiro.movimentacoes.byConta(body.conta_id)
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<FinanceiroMovimentacao[]>(queryKey)

      const tempMov: FinanceiroMovimentacao = {
        id: `__optimistic__${Date.now()}`,
        conta_id: body.conta_id,
        tipo: body.tipo,
        subconta: body.subconta,
        motivo: body.motivo,
        valor: body.valor,
        data: body.data,
        transferencia_destino_id: body.transferencia_destino_id ?? null,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<FinanceiroMovimentacao[]>(queryKey, (old) => [tempMov, ...(old ?? [])])

      return { prev, queryKey }
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(ctx.queryKey, ctx.prev)
    },
    // ─────────────────────────────────────────────────────────────────────
    mutationFn: async (body: {
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
    }) => {
      const { data: movId, error } = await supabase.rpc('register_financeiro_movement', {
        p_conta_id: body.conta_id,
        p_tipo: body.tipo,
        p_subconta: body.subconta,
        p_motivo: body.motivo,
        p_valor: body.valor,
        p_data: body.data,
        p_delta_caixa: body.delta_caixa,
        p_delta_aplicado: body.delta_aplicado,
        p_destino_conta_id: body.destino_conta_id ?? null,
        p_delta_destino_caixa: body.delta_destino_caixa ?? 0,
        p_transferencia_destino_id: body.transferencia_destino_id ?? null,
      })
      if (error) throw error
      return movId
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.byConta(vars.conta_id) })
      if (vars.destino_conta_id) {
        qc.invalidateQueries({
          queryKey: queryKeys.financeiro.movimentacoes.byConta(vars.destino_conta_id),
        })
      }
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
    },
  })
}

/**
 * Atomically reverses a financeiro movement: restores the account balance(s)
 * and deletes the movement log row in a single DB transaction.
 *
 * Pass the SAME deltas used when registering — the RPC negates them internally.
 */
export function useReverseFinanceiroMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      mov_id: string
      conta_id: string
      delta_caixa: number
      delta_aplicado: number
      destino_conta_id?: string | null
      delta_destino_caixa?: number
    }) => {
      const { error } = await supabase.rpc('reverse_financeiro_movement', {
        p_mov_id: body.mov_id,
        p_conta_id: body.conta_id,
        p_delta_caixa: body.delta_caixa,
        p_delta_aplicado: body.delta_aplicado,
        p_destino_conta_id: body.destino_conta_id ?? null,
        p_delta_destino_caixa: body.delta_destino_caixa ?? 0,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.byConta(vars.conta_id) })
      if (vars.destino_conta_id) {
        qc.invalidateQueries({
          queryKey: queryKeys.financeiro.movimentacoes.byConta(vars.destino_conta_id),
        })
      }
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
    },
  })
}

export function useAllFinanceiroMovimentacoes() {
  return useQuery<FinanceiroMovimentacaoWithConta[]>({
    queryKey: queryKeys.financeiro.movimentacoes.all(),
    staleTime: 30_000, // 30s — refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_movimentacoes')
        .select('*, financeiro_contas(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as unknown as FinanceiroMovimentacaoWithConta[]
    },
  })
}

/* ── Fluxo de Caixa Projetado ── */

export interface FluxoCaixaSemana {
  semana: string
  receitas: number
  despesas: number
}

/**
 * Weekly projected cash flow for an obra between two dates.
 * All aggregation is done server-side via the `fluxo_caixa_projetado` RPC —
 * no client-side computation required.
 */
export function useFluxoCaixaProjetado(
  obraId: string | null,
  inicio: string | null,
  fim: string | null,
) {
  return useQuery<FluxoCaixaSemana[]>({
    queryKey: ['fluxo-caixa-projetado', obraId, inicio, fim],
    enabled: !!obraId && !!inicio && !!fim,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fluxo_caixa_projetado', {
        p_obra_id: obraId as string,
        p_inicio: inicio as string,
        p_fim: fim as string,
      })
      if (error) throw error
      return (data ?? []) as FluxoCaixaSemana[]
    },
  })
}

/* ── Meta Financeira (única linha — valor global sincronizado na nuvem) ── */

export interface FinanceiroMeta {
  id: string
  valor: number
  updated_at: string
}

/** Lê o valor da meta financeira global (sincronizado na nuvem). */
export function useFinanceiroMeta() {
  return useQuery<FinanceiroMeta>({
    queryKey: queryKeys.financeiro.meta(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_meta')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // PGRST116 = no rows → valor padrão 0
      if (error && error.code !== 'PGRST116') throw error
      return (data ?? { valor: 0 }) as FinanceiroMetaRow
    },
  })
}

/** Salva (upsert) o valor da meta financeira na nuvem. */
export function useUpsertFinanceiroMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (valor: number) => {
      // Busca a linha existente (há sempre uma após a migration)
      const { data: existing } = await supabase
        .from('financeiro_meta')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (existing?.id) {
        const { data, error } = await supabase
          .from('financeiro_meta')
          .update({ valor })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as FinanceiroMeta
      }
      // Fallback: insere se não existir (ex: tabela recém-criada sem seed)
      const { data, error } = await supabase
        .from('financeiro_meta')
        .insert({ valor })
        .select()
        .single()
      if (error) throw error
      return data as FinanceiroMeta
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.meta() })
      // Dashboard widgets display the financial goal — keep them in sync.
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// User Preferences (cloud-stored settings)
// ═══════════════════════════════════════════════════════════

/** Reads a single preference by key from the cloud. */
export function useUserPreference(chave: string) {
  return useQuery<string>({
    queryKey: queryKeys.userPreferences.byKey(chave),
    queryFn: async () => {
      // RLS ensures user_id = auth.uid() automatically — no need for explicit filter
      const { data, error } = await supabase
        .from('user_preferences')
        .select('valor')
        .eq('chave', chave)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return (data?.valor ?? '') as string
    },
  })
}

/** Upserts a preference value in the cloud using ON CONFLICT (user_id, chave). */
export function useUpdateUserPreference(chave: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (valor: string) => {
      // Single atomic upsert — user_id defaults to auth.uid() via the table default.
      // ON CONFLICT (user_id, chave) ensures idempotent writes per user.
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ chave, valor }, { onConflict: 'user_id,chave', ignoreDuplicates: false })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userPreferences.byKey(chave) }),
  })
}
