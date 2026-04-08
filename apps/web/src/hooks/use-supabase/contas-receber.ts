import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FinanceiroConta } from './financeiro'

// ═══════════════════════════════════════════════════════════
// Contas a Receber — tabela-pai + parcelas
// ═══════════════════════════════════════════════════════════

export interface ContaReceber {
  id: string
  descricao: string
  cliente: string | null
  obra_id: string | null
  observacoes: string | null
  valor_total: number
  created_at: string
}

export interface ContaReceberParcela {
  id: string
  conta_receber_id: string
  numero_parcela: number
  total_parcelas: number
  valor: number
  vencimento: string
  status: 'PENDENTE' | 'RECEBIDO' | 'ATRASADO'
  recebido_em: string | null
  conta_bancaria_id: string | null
  created_at: string
  contas_receber?: ContaReceber
}

type ContaReceberRow = Database['public']['Tables']['contas_receber']['Row']
type ContaReceberParcelaRow = Database['public']['Tables']['contas_receber_parcelas']['Row']
type ContaReceberParcelaQueryRow = ContaReceberParcelaRow & {
  contas_receber: ContaReceberRow | null
}
type CreateContaReceberParcelasArg =
  Database['public']['Functions']['create_conta_receber']['Args']['p_parcelas']

function mapContaReceber(row: ContaReceberRow): ContaReceber {
  return {
    id: row.id,
    descricao: row.descricao,
    cliente: row.cliente,
    obra_id: row.obra_id,
    observacoes: row.observacoes,
    valor_total: row.valor_total,
    created_at: row.created_at,
  }
}

function mapContaReceberParcela(row: ContaReceberParcelaQueryRow): ContaReceberParcela {
  return {
    id: row.id,
    conta_receber_id: row.conta_receber_id,
    numero_parcela: row.numero_parcela,
    total_parcelas: row.total_parcelas,
    valor: row.valor,
    vencimento: row.vencimento,
    status: row.status as ContaReceberParcela['status'],
    recebido_em: row.recebido_em,
    conta_bancaria_id: row.conta_bancaria_id,
    created_at: row.created_at,
    contas_receber: row.contas_receber ? mapContaReceber(row.contas_receber) : undefined,
  }
}

export function useContasReceberParcelas() {
  return useQuery<ContaReceberParcela[]>({
    queryKey: queryKeys.contasReceber.parcelas(),
    staleTime: 30_000, // 30s
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber_parcelas')
        .select('*, contas_receber(*)')
        .order('vencimento', { ascending: true })
        .overrideTypes<ContaReceberParcelaQueryRow[]>()
      if (error) throw error
      return (data ?? []).map(mapContaReceberParcela)
    },
  })
}

export function useCreateContaReceber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      descricao: string
      cliente: string | null
      obra_id: string | null
      observacoes: string | null
      valor_total: number
      parcelas: CreateContaReceberParcelasArg
    }) => {
      // Atomic RPC: parent + installments in one transaction.
      const { data: contaId, error } = await supabase.rpc('create_conta_receber', {
        p_descricao: body.descricao,
        p_cliente: body.cliente,
        p_obra_id: body.obra_id,
        p_observacoes: body.observacoes,
        p_valor_total: body.valor_total,
        p_parcelas: body.parcelas,
      })
      if (error) throw error
      return { id: contaId } as ContaReceber
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contasReceber.all() }),
  })
}

export function useDeleteContaReceber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('contas_receber')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A conta a receber não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.all() })
      // Parcelas already RECEBIDO have associated financeiro movements/balances.
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
    },
  })
}

export function useReceberParcela() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (body: {
      parcelaId: string
      contaBancariaId: string
      valor: number
      dataRecebimento: string
      descricao: string
      numeroParcela: number
      totalParcelas: number
    }) => {
      await qc.cancelQueries({ queryKey: queryKeys.contasReceber.all() })
      await qc.cancelQueries({ queryKey: queryKeys.financeiro.contas() })

      const prevParcelas = qc.getQueryData<ContaReceberParcela[]>(
        queryKeys.contasReceber.parcelas(),
      )
      const prevContas = qc.getQueryData<FinanceiroConta[]>(queryKeys.financeiro.contas())

      qc.setQueryData<ContaReceberParcela[]>(
        queryKeys.contasReceber.parcelas(),
        (old) =>
          old?.map((p) =>
            p.id === body.parcelaId
              ? {
                  ...p,
                  status: 'RECEBIDO' as const,
                  recebido_em: body.dataRecebimento,
                  conta_bancaria_id: body.contaBancariaId,
                }
              : p,
          ) ?? [],
      )

      qc.setQueryData<FinanceiroConta[]>(
        queryKeys.financeiro.contas(),
        (old) =>
          old?.map((c) =>
            c.id === body.contaBancariaId ? { ...c, valor_caixa: c.valor_caixa + body.valor } : c,
          ) ?? [],
      )

      return { prevParcelas, prevContas }
    },

    onError: (_err, _body, ctx) => {
      if (ctx?.prevParcelas !== undefined)
        qc.setQueryData(queryKeys.contasReceber.parcelas(), ctx.prevParcelas)
      if (ctx?.prevContas !== undefined)
        qc.setQueryData(queryKeys.financeiro.contas(), ctx.prevContas)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contasReceber.all() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.contas() })
      qc.invalidateQueries({ queryKey: queryKeys.financeiro.movimentacoes.all() })
    },

    // Atomic RPC: marks parcela RECEBIDO + credits balance + logs movement
    // in a single DB transaction.
    mutationFn: async (body: {
      parcelaId: string
      contaBancariaId: string
      valor: number
      dataRecebimento: string
      descricao: string
      numeroParcela: number
      totalParcelas: number
    }) => {
      const { error } = await supabase.rpc('receber_parcela', {
        p_parcela_id: body.parcelaId,
        p_conta_bancaria_id: body.contaBancariaId,
        p_valor: body.valor,
        p_data_recebimento: body.dataRecebimento,
        p_descricao: body.descricao,
        p_numero_parcela: body.numeroParcela,
        p_total_parcelas: body.totalParcelas,
      })
      if (error) throw error
    },
  })
}
