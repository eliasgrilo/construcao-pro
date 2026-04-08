export const queryKeys = {
  almoxarifados: {
    all: () => ['almoxarifados'] as const,
    byObra: (obraId: string) => ['obra', obraId, 'almoxarifados'] as const,
  },
  categorias: {
    all: () => ['categorias'] as const,
    withCount: () => ['categorias', 'with-count'] as const,
  },
  contasPagar: {
    all: () => ['contas_pagar'] as const,
    parcelas: () => ['contas_pagar', 'parcelas'] as const,
    byNotaFiscal: (nfId: string | null) => ['contas_pagar', 'by_nf', nfId] as const,
  },
  contasReceber: {
    all: () => ['contas_receber'] as const,
    parcelas: () => ['contas_receber', 'parcelas'] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    custoPorObra: () => ['dashboard', 'custo-por-obra'] as const,
    movimentacoesRecentes: (limit?: number) =>
      limit == null
        ? (['dashboard', 'movimentacoes-recentes'] as const)
        : (['dashboard', 'movimentacoes-recentes', limit] as const),
  },
  documentos: {
    all: () => ['documentos'] as const,
    categorias: () => ['documentos', 'categorias'] as const,
    lista: () => ['documentos', 'lista'] as const,
  },
  estoque: {
    all: () => ['estoque'] as const,
    alertas: () => ['estoque', 'alertas'] as const,
    byObra: (obraId: string) => ['obra', obraId, 'estoque'] as const,
    costTrend: () => ['estoque', 'cost-trend'] as const,
  },
  financeiro: {
    contas: () => ['financeiro', 'contas'] as const,
    meta: () => ['financeiro', 'meta'] as const,
    movimentacoes: {
      all: () => ['financeiro', 'movimentacoes', 'all'] as const,
      byConta: (contaId: string) => ['financeiro', 'movimentacoes', contaId] as const,
    },
  },
  fornecedores: {
    all: () => ['fornecedores'] as const,
    paginated: (page: number, pageSize: number, search?: string) =>
      ['fornecedores', 'paginated', page, pageSize, search ?? ''] as const,
    categoriaMap: () => ['fornecedores', 'categoria-map'] as const,
    priceRanking: () => ['fornecedores', 'price-ranking'] as const,
    movimentacoes: (fornecedorId: string | null) =>
      ['movimentacoes', 'fornecedor', fornecedorId] as const,
  },
  materiais: {
    all: () => ['materiais'] as const,
    paginated: (page: number, pageSize: number, search?: string, categoriaId?: string) =>
      ['materiais', 'paginated', page, pageSize, search ?? '', categoriaId ?? ''] as const,
    entradas: (materialId: string) => ['material', materialId, 'entradas'] as const,
  },
  movimentacoes: {
    all: () => ['movimentacoes'] as const,
    byObra: (obraId: string) => ['obra', obraId, 'movimentacoes'] as const,
  },
  notasFiscais: {
    all: () => ['notas-fiscais'] as const,
    itens: (nfId?: string | null) =>
      nfId === undefined
        ? (['notas-fiscais', 'itens'] as const)
        : (['notas-fiscais', 'itens', nfId] as const),
  },
  obras: {
    all: () => ['obras'] as const,
    detail: (obraId: string) => ['obra', obraId] as const,
    custos: (obraId: string) => ['obra', obraId, 'custos'] as const,
    manutencao: {
      all: () => ['obra_manutencao'] as const,
      ativa: (obraId: string) => ['obra_manutencao', 'ativa', obraId] as const,
      historico: (obraId: string) => ['obra_manutencao', 'historico', obraId] as const,
      todasAtivas: () => ['obra_manutencao', 'todas_ativas'] as const,
    },
    burocracia: (obraId: string) => ['obra-lancamentos-burocracia', obraId] as const,
  },
  tarefas: {
    all: () => ['tarefas'] as const,
  },
  userPreferences: {
    all: () => ['user-preferences'] as const,
    byKey: (chave: string) => ['user-preferences', chave] as const,
  },
  usuarios: {
    all: () => ['usuarios'] as const,
  },
}
