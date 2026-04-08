import { getRelationCount } from '@/hooks/use-supabase/shared'
import {
  invalidateEntradaAnalyticsQueries,
  invalidateMovimentacaoDerivedQueries,
} from '@/lib/query-invalidation'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// ═══════════════════════════════════════════════════════════
// Categorias
// ═══════════════════════════════════════════════════════════

export type CategoriaUnidade =
  | 'UN'
  | 'KG'
  | 'M'
  | 'M2'
  | 'M3'
  | 'L'
  | 'CX'
  | 'PC'
  | 'SC'
  | 'TB'
  | 'GL'
  | 'FD'
  | 'RL'
  | 'PR'

export interface CategoriaRow {
  id: string
  nome: string
  unidade: CategoriaUnidade
  created_at: string
  updated_at: string
}

export interface CategoriaWithCountRow extends CategoriaRow {
  _count: { materiais: number }
}

type CategoriaTable = Database['public']['Tables']['categorias']
type MaterialTable = Database['public']['Tables']['materiais']
type CategoriaWithMaterialCountQueryRow = CategoriaTable['Row'] & {
  materiais: Array<{ count: number | null }> | null
}

function mapCategoriaWithCount(row: CategoriaWithMaterialCountQueryRow): CategoriaWithCountRow {
  return {
    created_at: row.created_at,
    id: row.id,
    nome: row.nome,
    unidade: row.unidade,
    updated_at: row.updated_at,
    _count: { materiais: getRelationCount(row.materiais) },
  }
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    staleTime: 1000 * 60, // 1 min — categories used as dropdown, refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nome')
      if (error) throw error
      return (data || []) as CategoriaRow[]
    },
  })
}

export function useCategoriasWithCount() {
  return useQuery<CategoriaWithCountRow[]>({
    queryKey: ['categorias', 'with-count'],
    staleTime: 1000 * 60, // 1 min — same as useCategorias
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*, materiais(count)')
        .order('nome')
        .overrideTypes<CategoriaWithMaterialCountQueryRow[]>()
      if (error) throw error
      return (data ?? []).map(mapCategoriaWithCount)
    },
  })
}

export function useCreateCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      nome: string
      unidade:
        | 'UN'
        | 'KG'
        | 'M'
        | 'M2'
        | 'M3'
        | 'L'
        | 'CX'
        | 'PC'
        | 'SC'
        | 'TB'
        | 'GL'
        | 'FD'
        | 'RL'
        | 'PR'
      minimo?: number
    }) => {
      const { data, error } = await supabase
        .from('categorias')
        .insert({
          nome: body.nome,
          unidade: body.unidade,
          minimo: body.minimo,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
    },
  })
}

export function useUpdateCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; nome?: string; unidade?: string }) => {
      const update: CategoriaTable['Update'] = {}
      if (body.nome !== undefined) update.nome = body.nome
      if (body.unidade !== undefined) update.unidade = body.unidade as CategoriaUnidade
      const { data, error } = await supabase
        .from('categorias')
        .update(update)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
    },
  })
}

export function useDeleteCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A categoria não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Materiais
// ═══════════════════════════════════════════════════════════

export interface MaterialRow {
  id: string
  nome: string
  codigo: string | null
  categoria_id: string | null
  estoque_minimo: number | null
  preco_unitario: number
  descricao: string | null
  codigo_barras: string | null
  unidade: CategoriaUnidade | null
  created_at: string
  updated_at: string
  categoria?: { id: string; nome: string; unidade: CategoriaUnidade } | null
}

export function useMateriais(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['materiais'],
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais')
        .select('*, categoria:categorias(id, nome, unidade)')
        .order('nome')
      if (error) throw error
      return (data || []) as MaterialRow[]
    },
  })
}

export interface PaginatedMateriais {
  data: MaterialRow[]
  count: number
}

export function useMaterialsPaginated(opts: {
  page: number
  pageSize: number
  search?: string
  categoriaId?: string
}) {
  const { page, pageSize, search, categoriaId } = opts
  return useQuery<PaginatedMateriais>({
    queryKey: queryKeys.materiais.paginated(page, pageSize, search, categoriaId),
    staleTime: 60_000,
    queryFn: async () => {
      const from = page * pageSize
      const to = from + pageSize - 1
      let q = supabase
        .from('materiais')
        .select('*, categoria:categorias(id, nome, unidade)', { count: 'exact' })
        .order('nome')
        .range(from, to)
      if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
      if (categoriaId) q = q.eq('categoria_id', categoriaId)
      const { data, error, count } = await q
      if (error) throw error
      return { data: (data ?? []) as MaterialRow[], count: count ?? 0 }
    },
  })
}

const MATERIAIS_PAGE_SIZE = 25

export function useMaterialsInfinite(opts?: { search?: string; categoriaId?: string }) {
  const { search, categoriaId } = opts ?? {}
  return useInfiniteQuery<MaterialRow[], Error>({
    queryKey: ['materiais', 'infinite', search ?? '', categoriaId ?? ''],
    staleTime: 60_000,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MATERIAIS_PAGE_SIZE) return undefined
      return allPages.length * MATERIAIS_PAGE_SIZE
    },
    queryFn: async ({ pageParam }) => {
      const from = pageParam as number
      const to = from + MATERIAIS_PAGE_SIZE - 1
      let q = supabase
        .from('materiais')
        .select('*, categoria:categorias(id, nome, unidade)')
        .order('nome')
        .range(from, to)
      if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
      if (categoriaId) q = q.eq('categoria_id', categoriaId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as MaterialRow[]
    },
  })
}

export function useCreateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      nome: string
      codigo: string
      categoria_id: string
      unidade: string
      estoque_minimo?: number
    }) => {
      const payload: MaterialTable['Insert'] = {
        nome: body.nome,
        codigo: body.codigo,
        categoria_id: body.categoria_id,
        unidade: body.unidade as CategoriaUnidade,
        estoque_minimo: body.estoque_minimo,
      }
      const { data, error } = await supabase.from('materiais').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
    },
  })
}

export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      id: string
      nome?: string
      codigo?: string
      categoria_id?: string
      unidade?: string
      estoque_minimo?: number
    }) => {
      const { id, ...rest } = body
      const payload: MaterialTable['Update'] = {}
      if (rest.nome !== undefined) payload.nome = rest.nome
      if (rest.codigo !== undefined) payload.codigo = rest.codigo
      if (rest.categoria_id !== undefined) payload.categoria_id = rest.categoria_id
      if (rest.unidade !== undefined) payload.unidade = rest.unidade as CategoriaUnidade
      if (rest.estoque_minimo !== undefined) payload.estoque_minimo = rest.estoque_minimo
      const { data, error } = await supabase
        .from('materiais')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
    },
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('materiais')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('O material não pôde ser excluído. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Estoques
// ═══════════════════════════════════════════════════════════

export interface EstoqueRow {
  id: string
  material_id: string
  almoxarifado_id: string
  quantidade: number
  created_at: string
  updated_at: string
  material: {
    id: string
    nome: string
    codigo: string | null
    estoque_minimo: number | null
    preco_unitario: number
    categoria: { id: string; nome: string; unidade: CategoriaUnidade } | null
  }
  almoxarifado: {
    id: string
    nome: string
    obra_id?: string
    obra: { id: string; nome: string; endereco?: string } | null
  }
}

export function useEstoque() {
  return useQuery({
    queryKey: ['estoque'],
    staleTime: 30_000, // 30 s — heavy multi-join query, match useObraEstoque
    queryFn: async () => {
      const { data, error } = await supabase.from('estoques').select(`
                    *,
                    material:materiais(id, nome, codigo, estoque_minimo, preco_unitario, categoria:categorias(id, nome, unidade)),
                    almoxarifado:almoxarifados(id, nome, obra:obras(id, nome, endereco))
                `)
      if (error) throw error
      return (data || []) as EstoqueRow[]
    },
  })
}

export function useObraEstoque(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId, 'estoque'],
    queryFn: async () => {
      // Single query using PostgREST !inner join — eliminates the previous 2-step
      // waterfall (fetch almoxarifado IDs → then filter estoques).
      // !inner makes it an INNER JOIN so .eq() on the embedded table filters correctly.
      const { data, error } = await supabase
        .from('estoques')
        .select(`
          *,
          material:materiais(id, nome, codigo, estoque_minimo, preco_unitario, categoria:categorias(id, nome, unidade)),
          almoxarifado:almoxarifados!almoxarifado_id!inner(id, nome, obra_id, obra:obras(id, nome))
        `)
        .eq('almoxarifado.obra_id', obraId)
      if (error) throw error
      return (data || []) as EstoqueRow[]
    },
    staleTime: 30_000,
    enabled: !!obraId,
  })
}

export function useDeleteEstoque() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['estoque'] })
      const prevEstoque = qc.getQueryData(['estoque'])
      // Remove item optimistically from any list query containing it
      qc.setQueriesData<unknown[]>({ queryKey: ['estoque'] }, (old) =>
        Array.isArray(old)
          ? old.filter(
              (item) => !item || typeof item !== 'object' || !('id' in item) || item.id !== id,
            )
          : old,
      )
      return { prevEstoque }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevEstoque !== undefined) qc.setQueryData(['estoque'], ctx.prevEstoque)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'obra' && q.queryKey.length > 2,
      })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('estoques')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('O item de estoque não pôde ser excluído. Verifique suas permissões.')
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Movimentações
// ═══════════════════════════════════════════════════════════

export interface MovimentacaoRow {
  id: string
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
  material_id: string
  quantidade: number
  preco_unitario: number | null
  almoxarifado_id: string
  almoxarifado_destino_id: string | null
  fornecedor_id: string | null
  nf_id: string | null
  usuario_id: string | null
  observacao: string | null
  unidade: string | null
  forma_pagamento: string | null
  status_transferencia: string | null
  created_at: string
  material: {
    id: string
    nome: string
    codigo: string | null
    categoria?: { id: string; nome: string } | null
  } | null
  almoxarifado: {
    id: string
    nome: string
    obra_id?: string
    obra: { id: string; nome: string } | null
  } | null
  almoxarifado_destino: {
    id: string
    nome: string
    obra: { id: string; nome: string } | null
  } | null
  usuario: { id: string; nome: string } | null
  fornecedor: { id: string; nome: string; cnpj?: string | null } | null
}

export function useMovimentacoes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['movimentacoes'],
    staleTime: 30_000, // 30 s — heavy 5-table join with 200-row limit
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
                    *,
                    material:materiais(id, nome, codigo),
                    almoxarifado:almoxarifados!almoxarifado_id(id, nome, obra:obras(id, nome)),
                    almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, obra:obras(id, nome)),
                    usuario:usuarios(id, nome),
                    fornecedor:fornecedores(id, nome, cnpj)
                `)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data || []) as MovimentacaoRow[]
    },
  })
}

export function useObraMovimentacoes(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId, 'movimentacoes'],
    queryFn: async () => {
      // Single query using PostgREST !inner join — eliminates the previous 2-step
      // waterfall (fetch almoxarifado IDs → then filter movimentacoes).
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          material:materiais(id, nome, codigo),
          almoxarifado:almoxarifados!almoxarifado_id!inner(id, nome, obra_id, obra:obras(id, nome)),
          almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, obra:obras(id, nome)),
          usuario:usuarios(id, nome),
          fornecedor:fornecedores(id, nome)
        `)
        .eq('almoxarifado.obra_id', obraId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as MovimentacaoRow[]
    },
    staleTime: 30_000,
    enabled: !!obraId,
  })
}

function invalidateEstoqueMutationQueries(
  qc: ReturnType<typeof useQueryClient>,
  fornecedorId?: string | null,
) {
  invalidateMovimentacaoDerivedQueries(qc)
  qc.invalidateQueries({ queryKey: ['materiais'] })
  invalidateEntradaAnalyticsQueries(qc)

  if (fornecedorId) {
    qc.invalidateQueries({ queryKey: ['movimentacoes', 'fornecedor', fornecedorId] })
  }
}

export function useCreateMovimentacaoEntrada() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (params) => {
      const keys = [['estoque'], ['movimentacoes']]
      await Promise.all(keys.map((k) => qc.cancelQueries({ queryKey: k })))
      const snapshots = keys.map((k) => ({ k, v: qc.getQueryData(k) }))

      // Optimistically add a placeholder entry row
      qc.setQueriesData<EstoqueRow[]>({ queryKey: ['estoque'] }, (old) => {
        if (!Array.isArray(old)) return old
        const existing = old.find(
          (e) =>
            e.material_id === params.p_material_id &&
            e.almoxarifado_id === params.p_almoxarifado_id,
        )
        if (existing) {
          return old.map((e) =>
            e.material_id === params.p_material_id && e.almoxarifado_id === params.p_almoxarifado_id
              ? { ...e, quantidade: e.quantidade + params.p_quantidade }
              : e,
          )
        }
        return old
      })

      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      for (const { k, v } of ctx?.snapshots ?? []) qc.setQueryData(k, v)
    },
    onSettled: (_data, _err, params) => {
      invalidateEstoqueMutationQueries(qc, params.p_fornecedor_id)
    },
    mutationFn: async (params: {
      p_material_id: string
      p_quantidade: number
      p_preco_unitario: number
      p_almoxarifado_id: string
      p_fornecedor_id?: string
      p_observacao?: string
      p_unidade?: string
      p_forma_pagamento?: string
    }) => {
      const { data, error } = await supabase.rpc('criar_movimentacao_entrada', {
        p_material_id: params.p_material_id,
        p_quantidade: params.p_quantidade,
        p_preco_unitario: params.p_preco_unitario,
        p_almoxarifado_id: params.p_almoxarifado_id,
        p_fornecedor_id: params.p_fornecedor_id || null,
        p_observacao: params.p_observacao || null,
        p_unidade: params.p_unidade || null,
        p_forma_pagamento: params.p_forma_pagamento || null,
        p_nf_id: null,
      })
      if (error) throw error
      return data
    },
  })
}

export function useCreateEntradaEstoqueFinanceiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      p_material_id: string
      p_quantidade: number
      p_preco_unitario: number
      p_almoxarifado_id: string
      p_conta_id: string
      p_subconta: 'CAIXA' | 'APLICADO'
      p_motivo: string
      p_data?: string
      p_fornecedor_id?: string
      p_observacao?: string
      p_unidade?: string
      p_forma_pagamento?: string
      p_nf_id?: string | null
    }) => {
      const { data, error } = await supabase.rpc('create_entrada_estoque_financeiro', {
        p_material_id: params.p_material_id,
        p_quantidade: params.p_quantidade,
        p_preco_unitario: params.p_preco_unitario,
        p_almoxarifado_id: params.p_almoxarifado_id,
        p_conta_id: params.p_conta_id,
        p_subconta: params.p_subconta,
        p_motivo: params.p_motivo,
        p_data: params.p_data ?? null,
        p_fornecedor_id: params.p_fornecedor_id ?? null,
        p_observacao: params.p_observacao ?? null,
        p_unidade: params.p_unidade ?? null,
        p_forma_pagamento: params.p_forma_pagamento ?? null,
        p_nf_id: params.p_nf_id ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, params) => {
      invalidateEstoqueMutationQueries(qc, params.p_fornecedor_id)
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', params.p_conta_id] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', 'all'] })
    },
  })
}

export function useCreateMovimentacaoSaida() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: ['estoque'] })
      const snapshot = qc.getQueryData(['estoque'])
      qc.setQueriesData<EstoqueRow[]>({ queryKey: ['estoque'] }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map((e) =>
          e.material_id === params.p_material_id && e.almoxarifado_id === params.p_almoxarifado_id
            ? { ...e, quantidade: Math.max(0, e.quantidade - params.p_quantidade) }
            : e,
        )
      })
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot !== undefined) qc.setQueryData(['estoque'], ctx.snapshot)
    },
    onSettled: () => {
      invalidateMovimentacaoDerivedQueries(qc)
    },
    mutationFn: async (params: {
      p_material_id: string
      p_quantidade: number
      p_preco_unitario: number
      p_almoxarifado_id: string
      p_observacao?: string
      p_unidade?: string
    }) => {
      const { data, error } = await supabase.rpc('criar_movimentacao_saida', {
        p_material_id: params.p_material_id,
        p_quantidade: params.p_quantidade,
        p_preco_unitario: params.p_preco_unitario,
        p_almoxarifado_id: params.p_almoxarifado_id,
        p_observacao: params.p_observacao || null,
        p_unidade: params.p_unidade || null,
      })
      if (error) throw error
      return data
    },
  })
}

export function useCreateMovimentacaoTransferencia() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: ['estoque'] })
      const snapshot = qc.getQueryData(['estoque'])
      // Optimistically deduct from origin; destination reflects after DB confirms
      qc.setQueriesData<EstoqueRow[]>({ queryKey: ['estoque'] }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map((e) =>
          e.material_id === params.p_material_id && e.almoxarifado_id === params.p_almoxarifado_id
            ? { ...e, quantidade: Math.max(0, e.quantidade - params.p_quantidade) }
            : e,
        )
      })
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot !== undefined) qc.setQueryData(['estoque'], ctx.snapshot)
    },
    onSettled: () => {
      invalidateMovimentacaoDerivedQueries(qc)
    },
    mutationFn: async (params: {
      p_material_id: string
      p_quantidade: number
      p_almoxarifado_id: string
      p_almoxarifado_destino_id: string
      p_observacao?: string
      p_unidade?: string
    }) => {
      const { data, error } = await supabase.rpc('criar_movimentacao_transferencia', {
        p_material_id: params.p_material_id,
        p_quantidade: params.p_quantidade,
        p_almoxarifado_id: params.p_almoxarifado_id,
        p_almoxarifado_destino_id: params.p_almoxarifado_destino_id,
        p_observacao: params.p_observacao || null,
        p_unidade: params.p_unidade || null,
      })
      if (error) throw error
      return data
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Saldo de Estoque por Obra (RPC — nunca calcular no frontend)
// ═══════════════════════════════════════════════════════════

export interface SaldoEstoqueRow {
  material_id: string
  nome: string
  quantidade: number
  unidade: string
}

export function useSaldoEstoque(obraId: string | null) {
  return useQuery<SaldoEstoqueRow[]>({
    queryKey: ['saldo-estoque', obraId],
    enabled: !!obraId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('saldo_estoque', {
        p_obra_id: obraId as string,
      })
      if (error) throw new Error(`Falha ao calcular saldo de estoque: ${error.message}`)
      return (data ?? []) as SaldoEstoqueRow[]
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Alerta de Estoque Mínimo — RPC + Realtime (sem polling)
// ═══════════════════════════════════════════════════════════

export interface EstoqueMinimoAlerta {
  material_id: string
  nome: string
  quantidade_atual: number
  estoque_minimo: number
  unidade: string
}

export function useEstoqueMinimo(obraId: string | null) {
  const qc = useQueryClient()
  const queryKey = ['estoque-minimo', obraId]

  const query = useQuery<EstoqueMinimoAlerta[]>({
    queryKey,
    enabled: !!obraId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('verificar_estoque_minimo', {
        p_obra_id: obraId as string,
      })
      if (error) throw new Error(`Falha ao verificar estoque mínimo: ${error.message}`)
      return (data ?? []) as EstoqueMinimoAlerta[]
    },
  })

  // Realtime subscription — invalidates query on any movimentacoes change for this obra.
  // No polling: the channel pushes only when the DB row changes.
  useEffect(() => {
    if (!obraId) return

    const channel = supabase
      .channel(`estoque-minimo:${obraId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes',
        },
        () => {
          qc.invalidateQueries({ queryKey })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [obraId, qc]) // eslint-disable-line react-hooks/exhaustive-deps

  return query
}

export function useAprovarTransferencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (movimentacaoId: string) => {
      const { data, error } = await supabase.rpc('aprovar_transferencia', {
        p_movimentacao_id: movimentacaoId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateMovimentacaoDerivedQueries(qc)
    },
  })
}
