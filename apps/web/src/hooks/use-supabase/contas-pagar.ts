import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FinanceiroConta } from './financeiro'

// ═══════════════════════════════════════════════════════════
// Contas a Pagar — tabela-pai + parcelas
// ═══════════════════════════════════════════════════════════

export interface ContaPagar {
  id: string
  descricao: string
  categoria: string
  obra_id: string | null
  observacoes: string | null
  valor_total: number
  nf_id: string | null
  fornecedor_id: string | null
  created_at: string
}

export interface ContaPagarParcela {
  id: string
  conta_pagar_id: string
  numero_parcela: number
  total_parcelas: number
  valor: number
  vencimento: string
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO'
  pago_em: string | null
  conta_bancaria_id: string | null
  created_at: string
  contas_pagar?: ContaPagar
}

type ContaPagarRow = Database['public']['Tables']['contas_pagar']['Row']
type ContaPagarParcelaRow = Database['public']['Tables']['contas_pagar_parcelas']['Row']
type ContaPagarParcelaQueryRow = ContaPagarParcelaRow & {
  contas_pagar: ContaPagarRow | null
}
type ContaPagarResumoWithParcelasRow = Pick<ContaPagarRow, 'id' | 'descricao' | 'valor_total'> & {
  contas_pagar_parcelas: Array<Pick<ContaPagarParcelaRow, 'id' | 'status' | 'valor' | 'vencimento'>>
}
type CreateContaPagarParcelasArg =
  Database['public']['Functions']['create_conta_pagar']['Args']['p_parcelas']

function mapContaPagar(row: ContaPagarRow): ContaPagar {
  return {
    id: row.id,
    descricao: row.descricao,
    categoria: row.categoria,
    obra_id: row.obra_id,
    observacoes: row.observacoes,
    valor_total: row.valor_total,
    nf_id: row.nf_id,
    fornecedor_id: row.fornecedor_id,
    created_at: row.created_at,
  }
}

function mapContaPagarParcela(row: ContaPagarParcelaQueryRow): ContaPagarParcela {
  return {
    id: row.id,
    conta_pagar_id: row.conta_pagar_id,
    numero_parcela: row.numero_parcela,
    total_parcelas: row.total_parcelas,
    valor: row.valor,
    vencimento: row.vencimento,
    status: row.status as ContaPagarParcela['status'],
    pago_em: row.pago_em,
    conta_bancaria_id: row.conta_bancaria_id,
    created_at: row.created_at,
    contas_pagar: row.contas_pagar ? mapContaPagar(row.contas_pagar) : undefined,
  }
}

export function useContasPagarParcelas() {
  return useQuery<ContaPagarParcela[]>({
    queryKey: queryKeys.contasPagar.parcelas(),
    staleTime: 30_000, // 30s — refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar_parcelas')
        .select('*, contas_pagar(*)')
        .order('vencimento', { ascending: true })
        .overrideTypes<ContaPagarParcelaQueryRow[]>()
      if (error) throw error
      return (data ?? []).map(mapContaPagarParcela)
    },
  })
}

export function useCreateContaPagar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      descricao: string
      categoria: string
      obra_id: string | null
      observacoes: string | null
      valor_total: number
      nf_id?: string | null
      fornecedor_id?: string | null
      parcelas: CreateContaPagarParcelasArg
    }) => {
      // Atomic RPC: parent + installments in one transaction.
      // A failed installment insert will roll back the parent row,
      // preventing orphaned contas_pagar with no parcelas.
      const { data: contaId, error } = await supabase.rpc('create_conta_pagar', {
        p_descricao: body.descricao,
        p_categoria: body.categoria,
        p_obra_id: body.obra_id,
        p_observacoes: body.observacoes,
        p_valor_total: body.valor_total,
        p_nf_id: body.nf_id ?? null,
        p_fornecedor_id: body.fornecedor_id ?? null,
        p_parcelas: body.parcelas,
      })
      if (error) throw error
      return { id: contaId } as ContaPagar
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contasPagar.all() }),
  })
}

export function useDeleteContaPagar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A conta a pagar não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contasPagar.all() })
      // Parcelas that were already PAGO have associated financeiro movements/balances.
      // Invalidate financial caches so the Financeiro page doesn't show stale data.
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
    },
  })
}

/** Fetch contas_pagar linked to a specific NF-e ID */
export function useNfeContasPagar(nfId: string | null) {
  return useQuery<Array<ContaPagar & { contas_pagar_parcelas: ContaPagarParcela[] }>>({
    queryKey: queryKeys.contasPagar.byNotaFiscal(nfId),
    enabled: !!nfId,
    queryFn: async () => {
      if (!nfId) return []
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('id, descricao, valor_total, contas_pagar_parcelas(id, status, valor, vencimento)')
        .eq('nf_id', nfId)
        .overrideTypes<ContaPagarResumoWithParcelasRow[]>()
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        descricao: row.descricao,
        categoria: '',
        obra_id: null,
        observacoes: null,
        valor_total: row.valor_total,
        nf_id: nfId,
        fornecedor_id: null,
        created_at: '',
        contas_pagar_parcelas: row.contas_pagar_parcelas.map(
          (parcela) =>
            ({
              id: parcela.id,
              conta_pagar_id: row.id,
              numero_parcela: 0,
              total_parcelas: 0,
              valor: parcela.valor,
              vencimento: parcela.vencimento,
              status: parcela.status as ContaPagarParcela['status'],
              pago_em: null,
              conta_bancaria_id: null,
              created_at: '',
            }) satisfies ContaPagarParcela,
        ),
      }))
    },
  })
}

export function usePagarParcela() {
  const qc = useQueryClient()
  return useMutation({
    // ── Optimistic update ──────────────────────────────────
    onMutate: async (body) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic state
      await qc.cancelQueries({ queryKey: queryKeys.contasPagar.all() })
      await qc.cancelQueries({ queryKey: queryKeys.financeiro.contas() })

      // Snapshot current cache state for rollback
      const prevParcelas = qc.getQueryData<ContaPagarParcela[]>(queryKeys.contasPagar.parcelas())
      const prevContas = qc.getQueryData<FinanceiroConta[]>(queryKeys.financeiro.contas())

      // Optimistically mark parcela as PAGO
      qc.setQueryData<ContaPagarParcela[]>(
        queryKeys.contasPagar.parcelas(),
        (old) =>
          old?.map((p) =>
            p.id === body.parcelaId
              ? {
                  ...p,
                  status: 'PAGO' as const,
                  pago_em: body.dataPagamento,
                  conta_bancaria_id: body.contaBancariaId,
                }
              : p,
          ) ?? [],
      )

      // Optimistically deduct from conta valor_caixa
      qc.setQueryData<FinanceiroConta[]>(
        queryKeys.financeiro.contas(),
        (old) =>
          old?.map((c) =>
            c.id === body.contaBancariaId ? { ...c, valor_caixa: c.valor_caixa - body.valor } : c,
          ) ?? [],
      )

      return { prevParcelas, prevContas }
    },

    // ── Rollback on error ──────────────────────────────────
    onError: (_err, _body, ctx) => {
      if (ctx?.prevParcelas !== undefined)
        qc.setQueryData(queryKeys.contasPagar.parcelas(), ctx.prevParcelas)
      if (ctx?.prevContas !== undefined)
        qc.setQueryData(queryKeys.financeiro.contas(), ctx.prevContas)
    },

    // ── Always refetch after settle ────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contasPagar.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
    },

    // Atomic RPC: marks parcela PAGO + debits balance + logs movement
    // in a single DB transaction. Eliminates the read-then-write race condition
    // where two concurrent payments could overwrite each other's balance update.
    mutationFn: async (body: {
      parcelaId: string
      contaBancariaId: string
      valor: number
      dataPagamento: string
      descricao: string
      numeroParcela: number
      totalParcelas: number
    }) => {
      const { error } = await supabase.rpc('pagar_parcela', {
        p_parcela_id: body.parcelaId,
        p_conta_bancaria_id: body.contaBancariaId,
        p_valor: body.valor,
        p_data_pagamento: body.dataPagamento,
        p_descricao: body.descricao,
        p_numero_parcela: body.numeroParcela,
        p_total_parcelas: body.totalParcelas,
      })
      if (error) throw error
    },
  })
}
