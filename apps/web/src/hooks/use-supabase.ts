import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats')
      if (error) throw error
      return data as {
        obrasAtivas: number
        totalObras: number
        totalMateriais: number
        totalMovimentacoes: number
        totalNFs: number
        alertasEstoque: number
        custoTotal: number
        orcamentoTotal: number
      }
    },
  })
}

export function useDashboardCustoPorObra() {
  return useQuery({
    queryKey: ['dashboard', 'custo-por-obra'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_custo_por_obra')
      if (error) throw error
      return (data || []) as {
        id: string
        obra: string
        endereco: string
        status: string
        custo: number
        orcamento: number
        valor_terreno: number
        valor_burocracia: number
        valor_construcao: number
        valor_venda: number
        percentual: number
      }[]
    },
  })
}

export function useMovimentacoesRecentes(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'movimentacoes-recentes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_movimentacoes_recentes', { p_limit: limit })
      if (error) throw error
      return (data || []) as any[]
    },
  })
}

export function useEstoqueAlertas() {
  return useQuery({
    queryKey: ['estoque', 'alertas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_estoque_alertas')
      if (error) throw error
      return (data || []) as any[]
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Obras
// ═══════════════════════════════════════════════════════════

export function useObras() {
  return useQuery({
    queryKey: ['obras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('*, almoxarifados(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((o: any) => ({
        ...o,
        _count: { almoxarifados: o.almoxarifados?.[0]?.count ?? 0 },
      }))
    },
  })
}

export function useObra(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId],
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
      status?: string
      orcamento?: number
      valorTerreno?: number
      valorBurocracia?: number
      valorConstrucao?: number
    }) => {
      const { data, error } = await supabase
        .from('obras')
        .insert({
          nome: body.nome,
          endereco: body.endereco,
          status: (body.status as any) || 'ATIVA',
          orcamento: body.orcamento || 0,
          valor_terreno: body.valorTerreno || 0,
          valor_burocracia: body.valorBurocracia || 0,
          valor_construcao: body.valorConstrucao || 0,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
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
      status?: string
      orcamento?: number
      valor_terreno?: number
      valor_burocracia?: number
      valor_construcao?: number
      valor_venda?: number
    }) => {
      const { data, error } = await supabase
        .from('obras')
        .update(body as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['obra', vars.id] })
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteObra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('obras').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Obra Custos
// ═══════════════════════════════════════════════════════════

export function useObraCustos(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId, 'custos'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_obra_custos', { p_obra_id: obraId })
      if (error) throw error
      return data as any
    },
    enabled: !!obraId,
  })
}

// ═══════════════════════════════════════════════════════════
// Almoxarifados
// ═══════════════════════════════════════════════════════════

export function useAlmoxarifados() {
  return useQuery({
    queryKey: ['almoxarifados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('almoxarifados')
        .select('*, obra:obras(id, nome)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
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
      return data || []
    },
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
      qc.invalidateQueries({ queryKey: ['obra', vars.obra_id] })
      qc.invalidateQueries({ queryKey: ['almoxarifados'] })
    },
  })
}

export function useDeleteAlmoxarifado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('almoxarifados').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['almoxarifados'] })
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['obra'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Categorias
// ═══════════════════════════════════════════════════════════

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })
}

export function useCategoriasWithCount() {
  return useQuery({
    queryKey: ['categorias', 'with-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*, materiais(count)')
        .order('nome')
      if (error) throw error
      return (data || []).map((c: any) => ({
        ...c,
        _count: { materiais: c.materiais?.[0]?.count ?? 0 },
      }))
    },
  })
}

export function useCreateCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { nome: string; unidade: string }) => {
      const { data, error } = await supabase
        .from('categorias')
        .insert({
          nome: body.nome,
          unidade: body.unidade as any,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useUpdateCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; nome?: string; unidade?: string }) => {
      const update: Record<string, any> = {}
      if (body.nome !== undefined) update.nome = body.nome
      if (body.unidade !== undefined) update.unidade = body.unidade
      const { data, error } = await supabase
        .from('categorias')
        .update(update as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useDeleteCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categorias').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Materiais
// ═══════════════════════════════════════════════════════════

export function useMateriais() {
  return useQuery({
    queryKey: ['materiais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais')
        .select('*, categoria:categorias(id, nome, unidade)')
        .order('nome')
      if (error) throw error
      return data || []
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
      estoque_minimo?: number
      codigo_barras?: string
    }) => {
      const { data, error } = await supabase.from('materiais').insert(body).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
    },
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materiais').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Estoques
// ═══════════════════════════════════════════════════════════

export function useEstoque() {
  return useQuery({
    queryKey: ['estoque'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estoques').select(`
                    *,
                    material:materiais(id, nome, codigo, estoque_minimo, preco_unitario, categoria:categorias(id, nome, unidade)),
                    almoxarifado:almoxarifados(id, nome, obra:obras(id, nome, endereco))
                `)
      if (error) throw error
      return data || []
    },
  })
}

export function useObraEstoque(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId, 'estoque'],
    queryFn: async () => {
      const { data: almoxData, error: almoxError } = await supabase
        .from('almoxarifados')
        .select('id')
        .eq('obra_id', obraId)
      if (almoxError) throw almoxError
      const almoxIds = (almoxData ?? []).map((a) => a.id)
      if (almoxIds.length === 0) return []

      const { data, error } = await supabase
        .from('estoques')
        .select(`
                    *,
                    material:materiais(id, nome, codigo, estoque_minimo, preco_unitario, categoria:categorias(id, nome, unidade)),
                    almoxarifado:almoxarifados!almoxarifado_id(id, nome, obra_id, obra:obras(id, nome))
                `)
        .in('almoxarifado_id', almoxIds)
      if (error) throw error
      return data || []
    },
    enabled: !!obraId,
  })
}

export function useDeleteEstoque() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('estoques').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['obra'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Movimentações
// ═══════════════════════════════════════════════════════════

export function useMovimentacoes() {
  return useQuery({
    queryKey: ['movimentacoes'],
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
      return data || []
    },
  })
}

export function useObraMovimentacoes(obraId: string) {
  return useQuery({
    queryKey: ['obra', obraId, 'movimentacoes'],
    queryFn: async () => {
      const { data: almoxData, error: almoxError } = await supabase
        .from('almoxarifados')
        .select('id')
        .eq('obra_id', obraId)
      if (almoxError) throw almoxError
      const almoxIds = (almoxData ?? []).map((a) => a.id)
      if (almoxIds.length === 0) return []

      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
                    *,
                    material:materiais(id, nome, codigo),
                    almoxarifado:almoxarifados!almoxarifado_id(id, nome, obra_id, obra:obras(id, nome)),
                    almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, obra:obras(id, nome)),
                    usuario:usuarios(id, nome),
                    fornecedor:fornecedores(id, nome)
                `)
        .in('almoxarifado_id', almoxIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!obraId,
  })
}

export function useCreateMovimentacaoEntrada() {
  const qc = useQueryClient()
  return useMutation({
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
      } as any)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
      qc.invalidateQueries({ queryKey: ['obra'] })
    },
  })
}

export function useCreateMovimentacaoSaida() {
  const qc = useQueryClient()
  return useMutation({
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
      } as any)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['obra'] })
    },
  })
}

export function useCreateMovimentacaoTransferencia() {
  const qc = useQueryClient()
  return useMutation({
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
      } as any)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['obra'] })
    },
  })
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
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['obra'] })
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Fornecedores
// ═══════════════════════════════════════════════════════════

export function useFornecedores() {
  return useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fornecedores').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })
}

export function useCreateFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      nome: string
      cnpj?: string
      telefone?: string
      email?: string
      endereco?: string
      observacao?: string
    }) => {
      const { data, error } = await supabase.from('fornecedores').insert(body).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] })
    },
  })
}

export function useDeleteFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fornecedores').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] })
    },
  })
}

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

/* ── Contas ── */

export function useFinanceiroContas() {
  return useQuery({
    queryKey: ['financeiro', 'contas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_contas' as any)
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as any as FinanceiroConta[]
    },
  })
}

export function useCreateFinanceiroConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      banco: string
      agencia: string
      numero_conta: string
      valor_caixa: number
      valor_aplicado: number
    }) => {
      const { data, error } = await supabase
        .from('financeiro_contas' as any)
        .insert(body)
        .select()
        .single()
      if (error) throw error
      return data as any as FinanceiroConta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] }),
  })
}

export function useUpdateFinanceiroConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<FinanceiroConta> & { id: string }) => {
      const { data, error } = await supabase
        .from('financeiro_contas' as any)
        .update(body as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as any as FinanceiroConta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] }),
  })
}

export function useDeleteFinanceiroConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financeiro_contas' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] }),
  })
}

/* ── Movimentações ── */

export function useFinanceiroMovimentacoes(contaId: string) {
  return useQuery({
    queryKey: ['financeiro', 'movimentacoes', contaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_movimentacoes' as any)
        .select('*')
        .eq('conta_id', contaId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any as FinanceiroMovimentacao[]
    },
    enabled: !!contaId,
  })
}

export function useCreateFinanceiroMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
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
        .from('financeiro_movimentacoes' as any)
        .insert(body)
        .select()
        .single()
      if (error) throw error
      return data as any as FinanceiroMovimentacao
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', vars.conta_id] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', 'all'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
    },
  })
}

export function useDeleteFinanceiroMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, contaId }: { id: string; contaId: string }) => {
      const { error } = await supabase
        .from('financeiro_movimentacoes' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
      return contaId
    },
    onSuccess: (contaId) => {
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', contaId] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', 'all'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
    },
  })
}

/** Todas as movimentações financeiras com a conta relacionada embutida. */
export function useAllFinanceiroMovimentacoes() {
  return useQuery({
    queryKey: ['financeiro', 'movimentacoes', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_movimentacoes' as any)
        .select('*, financeiro_contas(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
  })
}

// ═══════════════════════════════════════════════════════════
// Notas Fiscais
// ═══════════════════════════════════════════════════════════

export function useNotasFiscais() {
  return useQuery({
    queryKey: ['notas-fiscais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*, itens_nf(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((nf: any) => ({
        ...nf,
        _count: { itens: nf.itens_nf?.[0]?.count ?? 0 },
      }))
    },
  })
}
