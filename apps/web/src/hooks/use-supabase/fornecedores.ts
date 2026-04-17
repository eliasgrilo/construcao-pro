import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MovimentacaoRow } from './catalogo'

// ═══════════════════════════════════════════════════════════
// Fornecedores
// ═══════════════════════════════════════════════════════════

export interface FornecedorRow {
  id: string
  nome: string
  cnpj: string | null
  nome_fantasia: string | null
  inscricao_estadual: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  observacao: string | null
  cidade: string | null
  estado: string | null
  ativo: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type FornecedorTableRow = Database['public']['Tables']['fornecedores']['Row']

export function useFornecedores(options?: { enabled?: boolean; includeInactive?: boolean }) {
  return useQuery<FornecedorRow[]>({
    queryKey: queryKeys.fornecedores.all(),
    staleTime: 1000 * 60, // 1 min — refreshed by realtime
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      let query = supabase.from('fornecedores').select('*').order('nome')
      // By default only return active suppliers (not soft-deleted).
      if (!options?.includeInactive) query = query.is('deleted_at', null)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as FornecedorRow[]
    },
  })
}

export interface PaginatedFornecedores {
  data: FornecedorRow[]
  count: number
}

export function useFornecedoresPaginated(opts: {
  page: number
  pageSize: number
  search?: string
}) {
  const { page, pageSize, search } = opts
  return useQuery<PaginatedFornecedores>({
    queryKey: queryKeys.fornecedores.paginated(page, pageSize, search),
    staleTime: 60_000,
    queryFn: async () => {
      const from = page * pageSize
      const to = from + pageSize - 1
      let q = supabase
        .from('fornecedores')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('nome')
        .range(from, to)
      if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
      const { data, error, count } = await q
      if (error) throw error
      return { data: (data ?? []) as FornecedorRow[], count: count ?? 0 }
    },
  })
}

const FORNECEDORES_PAGE_SIZE = 25

export function useFornecedoresInfinite(opts?: { search?: string }) {
  const { search } = opts ?? {}
  return useInfiniteQuery<FornecedorRow[], Error>({
    queryKey: ['fornecedores', 'infinite', search ?? ''],
    staleTime: 60_000,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < FORNECEDORES_PAGE_SIZE) return undefined
      return allPages.length * FORNECEDORES_PAGE_SIZE
    },
    queryFn: async ({ pageParam }) => {
      const from = pageParam as number
      const to = from + FORNECEDORES_PAGE_SIZE - 1
      let q = supabase
        .from('fornecedores')
        .select('*')
        .is('deleted_at', null)
        .order('nome')
        .range(from, to)
      if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FornecedorRow[]
    },
  })
}

export function useCreateFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      nome: string
      cnpj?: string
      nome_fantasia?: string | null
      inscricao_estadual?: string | null
      telefone?: string
      email?: string
      endereco?: string
      observacao?: string
      cidade?: string | null
      estado?: string | null
    }) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({ ...body, ativo: true, deleted_at: null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fornecedores.all() })
    },
  })
}

export function useUpdateFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      nome,
      cnpj,
      nome_fantasia,
      inscricao_estadual,
      telefone,
      email,
      endereco,
      observacao,
      ativo,
      cidade,
      estado,
    }: {
      id: string
      nome?: string
      cnpj?: string
      nome_fantasia?: string | null
      inscricao_estadual?: string | null
      telefone?: string
      email?: string
      endereco?: string
      observacao?: string
      ativo?: boolean
      cidade?: string | null
      estado?: string | null
    }) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .update({
          nome,
          cnpj,
          nome_fantasia,
          inscricao_estadual,
          telefone,
          email,
          endereco,
          observacao,
          ativo,
          cidade,
          estado,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.fornecedores.all() })
      qc.invalidateQueries({ queryKey: queryKeys.movimentacoes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.fornecedores.movimentacoes(vars.id) })
    },
  })
}

export function useDeleteFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    // Soft-delete: sets deleted_at=now() instead of hard-deleting.
    // Hard-deleting a supplier that has movement history destroys audit trails and
    // breaks reconciliation. The supplier is hidden from new entries but all
    // historical data (movimentacoes, notas_fiscais, contas_pagar) is preserved.
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fornecedores')
        .update({ deleted_at: new Date().toISOString(), ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fornecedores.all() })
      qc.invalidateQueries({ queryKey: queryKeys.notasFiscais.all() })
    },
  })
}

export function useFornecedorMovimentacoes(fornecedorId: string | null) {
  return useQuery<MovimentacaoRow[]>({
    queryKey: queryKeys.fornecedores.movimentacoes(fornecedorId),
    staleTime: 30_000, // 30s — refreshed by realtime
    queryFn: async () => {
      if (!fornecedorId) return []
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          material:materiais(id, nome, codigo, categoria:categorias(id, nome)),
          almoxarifado:almoxarifados!almoxarifado_id(id, nome, obra:obras(id, nome)),
          usuario:usuarios(id, nome)
        `)
        .eq('fornecedor_id', fornecedorId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as MovimentacaoRow[]
    },
    enabled: !!fornecedorId,
  })
}

export interface FornecedorCategoriaMapRow {
  fornecedor_id: string
  categoria_id: string
  categoria_nome: string
}

/**
 * Maps fornecedor → material categories via movimentações.
 * Uses a server-side DISTINCT RPC instead of fetching all movimentacoes rows,
 * reducing data transfer from O(N movements) to O(unique pairs) — typically <100 rows.
 */
export function useFornecedorCategoriaMap() {
  return useQuery<FornecedorCategoriaMapRow[]>({
    queryKey: queryKeys.fornecedores.categoriaMap(),
    staleTime: 1000 * 60, // 1 min — refreshed by realtime on movimentacoes change
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_fornecedor_category_map')
      if (error) throw error
      return data ?? []
    },
  })
}
