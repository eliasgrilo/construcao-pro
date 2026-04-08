import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/ui/query-error'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useAlmoxarifados,
  useEstoque,
  useEstoqueAlertas,
  useFinanceiroContas,
  useFornecedores,
  useMateriais,
} from '@/hooks/use-supabase'
import { accents } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  BaixaDialog,
  type BaixaTarget,
  DeleteEstoqueDialog,
  type DeleteTarget,
  NovaEntradaDialog,
  TransferDialog,
  type TransferTarget,
} from './estoque-dialogs'
import { EstoqueItemDetail } from './estoque-item-detail'
import {
  CategoryFilterChips,
  EstoqueHeroCard,
  EstoqueLoadingSkeleton,
  EstoqueTableHeader,
  LowStockBanner,
  ObraGroupGrid,
} from './estoque-parts'
import type { EstoqueItem, ObraGroup } from './estoque-types'
import { useEstoqueColumns } from './use-estoque-columns'

export function EstoquePage() {
  const { toast } = useToast()
  const { canManageEstoque } = usePermissions()

  const [selectedObra, setSelectedObra] = useState<string | null>(null)
  const [filterCategoria, setFilterCategoria] = useState('ALL')
  const [entradaOpen, setEntradaOpen] = useState(false)
  const [baixaTarget, setBaixaTarget] = useState<BaixaTarget | null>(null)
  const [transfTarget, setTransfTarget] = useState<TransferTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [detailItem, setDetailItem] = useState<EstoqueItem | null>(null)

  /* ── Queries ── */
  const { data: estoqueData, isLoading, isError, refetch } = useEstoque()
  const { data: materiaisData } = useMateriais()
  const { data: almoxData } = useAlmoxarifados()
  const { data: fornecedoresData } = useFornecedores()
  const { data: contasData } = useFinanceiroContas()

  const allItems = estoqueData || []
  const materiaisList = materiaisData || []
  const almoxList = almoxData || []
  const fornecedoresList = fornecedoresData || []
  const contasList = contasData || []

  /* ── Almoxarifados grouped by obra (for Nova Entrada dialog) ── */
  const almoxByObra = useMemo(() => {
    const map = new Map<
      string,
      {
        obraNome: string
        almoxs: { id: string; nome: string; obra?: { id: string; nome: string } | null }[]
      }
    >()
    for (const a of almoxList) {
      const obraNome = a.obra?.nome || 'Sem Obra'
      const obraId = a.obra?.id || 'sem-obra'
      if (!map.has(obraId)) map.set(obraId, { obraNome, almoxs: [] })
      map.get(obraId)?.almoxs.push(a)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].obraNome.localeCompare(b[1].obraNome))
  }, [almoxList])

  /* ── Group stock by obra ── */
  const { obraGroups, totals } = useMemo(() => {
    const map = new Map<string, ObraGroup>()
    for (const item of allItems) {
      const obraId = item.almoxarifado?.obra?.id || 'sem-obra'
      const obraNome = item.almoxarifado?.obra?.nome || 'Sem Obra'
      const obraEndereco = item.almoxarifado?.obra?.endereco || undefined
      if (!map.has(obraId)) {
        map.set(obraId, {
          obraId,
          obraNome,
          obraEndereco,
          items: [],
          totalItems: 0,
          totalQty: 0,
          totalCost: 0,
          lowStockCount: 0,
          almoxarifados: 0,
        })
      }
      const group = map.get(obraId)
      if (group) {
        group.items.push(item)
        group.totalItems++
        group.totalQty += item.quantidade ?? 0
        group.totalCost += (item.quantidade ?? 0) * (item.material?.preco_unitario ?? 0)
        const min = item.material?.estoque_minimo || 0
        if (min > 0 && (item.quantidade ?? 0) < min) group.lowStockCount++
      }
    }
    for (const group of map.values()) {
      const uniqueAlmox = new Set(
        group.items.map((i: EstoqueItem) => i.almoxarifado?.id).filter(Boolean),
      )
      group.almoxarifados = uniqueAlmox.size
    }
    const groups = Array.from(map.values()).sort((a, b) => a.obraNome.localeCompare(b.obraNome))
    const computed = {
      items: allItems.length,
      qty: allItems.reduce((s: number, i: EstoqueItem) => s + (i.quantidade ?? 0), 0),
      cost: allItems.reduce(
        (s: number, i: EstoqueItem) => s + (i.quantidade ?? 0) * (i.material?.preco_unitario ?? 0),
        0,
      ),
      obras: groups.length,
      lowStock: groups.reduce((s, g) => s + g.lowStockCount, 0),
    }
    return { obraGroups: groups, totals: computed }
  }, [allItems])

  const selectedGroup = selectedObra ? obraGroups.find((g) => g.obraId === selectedObra) : null

  /* ── Category filter ── */
  const { categorias, filteredData } = useMemo(() => {
    const dataSource = selectedObra === '__all__' ? allItems : (selectedGroup?.items ?? [])
    const set = new Map<string, number>()
    for (const e of dataSource) {
      const cat = e.material?.categoria?.nome ?? 'Sem Categoria'
      set.set(cat, (set.get(cat) ?? 0) + 1)
    }
    const cats = Array.from(set.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome, count]) => ({ key: nome, label: nome, count }))
    const filtered =
      filterCategoria === 'ALL'
        ? dataSource
        : dataSource.filter(
            (e) => (e.material?.categoria?.nome ?? 'Sem Categoria') === filterCategoria,
          )
    return { categorias: cats, filteredData: filtered }
  }, [allItems, selectedObra, selectedGroup, filterCategoria])

  /* ── Action helpers ── */
  const openBaixa = (item: EstoqueItem) =>
    setBaixaTarget({
      materialId: item.material?.id ?? '',
      materialNome: item.material?.nome ?? '—',
      materialCodigo: item.material?.codigo ?? '',
      almoxarifadoId: item.almoxarifado?.id ?? '',
      almoxarifadoNome: item.almoxarifado?.nome ?? '—',
      obraNome: item.almoxarifado?.obra?.nome ?? '—',
      quantidadeDisponivel: item.quantidade ?? 0,
      unidade: item.material?.unidade ?? item.material?.categoria?.unidade ?? 'UN',
      precoUnitario: item.material?.preco_unitario ?? 0,
    })

  const openTransfer = (item: EstoqueItem) =>
    setTransfTarget({
      materialId: item.material?.id ?? '',
      materialNome: item.material?.nome ?? '—',
      almoxarifadoId: item.almoxarifado?.id ?? '',
      almoxarifadoNome: item.almoxarifado?.nome ?? '—',
      quantidadeDisponivel: item.quantidade ?? 0,
      unidade: item.material?.unidade ?? item.material?.categoria?.unidade ?? 'UN',
    })

  const openDelete = (item: EstoqueItem) =>
    setDeleteTarget({
      id: item.id,
      materialId: item.material?.id ?? '',
      materialNome: item.material?.nome ?? '—',
      almoxarifadoId: item.almoxarifado?.id ?? '',
      almoxarifadoNome: item.almoxarifado?.nome ?? '—',
      quantidade: item.quantidade ?? 0,
      unidade: item.material?.unidade ?? item.material?.categoria?.unidade ?? 'UN',
      precoUnitario: item.material?.preco_unitario ?? 0,
    })

  /* ── Table columns ── */
  const columns = useEstoqueColumns({
    selectedObra,
    canManageEstoque,
    onBaixa: openBaixa,
    onTransfer: openTransfer,
    onDelete: openDelete,
    onDetail: setDetailItem,
  })

  if (isLoading) return <EstoqueLoadingSkeleton />
  if (isError)
    return (
      <div className="px-4 md:px-8 pt-10">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight mb-6">Estoque</h1>
        <QueryError onRetry={() => void refetch()} />
      </div>
    )

  const lowCount =
    selectedObra === '__all__' ? totals.lowStock : (selectedGroup?.lowStockCount ?? 0)

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Estoque</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Visão geral por obra e almoxarifado
          </p>
        </div>
        {canManageEstoque && (
          <Button onClick={() => setEntradaOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Entrada
          </Button>
        )}
      </div>

      <div className="px-4 md:px-8">
        <AnimatePresence mode="wait">
          {!selectedObra ? (
            /* ── Cards view ── */
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <EstoqueHeroCard
                totals={totals}
                onClick={() => {
                  setSelectedObra('__all__')
                  setFilterCategoria('ALL')
                }}
              />
              <ObraGroupGrid
                obraGroups={obraGroups}
                onSelect={(id) => {
                  setSelectedObra(id)
                  setFilterCategoria('ALL')
                }}
                onEntrada={() => setEntradaOpen(true)}
              />
            </motion.div>
          ) : (
            /* ── Table view ── */
            <motion.div
              key="table"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <EstoqueTableHeader
                selectedObra={selectedObra}
                selectedGroup={selectedGroup}
                totals={totals}
                onBack={() => {
                  setSelectedObra(null)
                  setFilterCategoria('ALL')
                }}
              />

              <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground">
                <span className="flex-shrink-0">📦</span>
                <span>
                  Use <strong>Baixa</strong> para registrar uso de materiais. Use <strong>↔</strong>{' '}
                  para transferir entre almoxarifados.
                </span>
              </div>

              <LowStockBanner lowCount={lowCount} />

              <CategoryFilterChips
                categorias={categorias}
                filteredData={filteredData}
                filterCategoria={filterCategoria}
                onFilterChange={setFilterCategoria}
              />

              <DataTable
                columns={columns}
                data={filteredData}
                isLoading={isLoading}
                searchPlaceholder={
                  selectedObra === '__all__'
                    ? 'Buscar em todo estoque...'
                    : `Buscar em ${selectedGroup?.obraNome ?? 'estoque'}...`
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DeleteEstoqueDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <BaixaDialog target={baixaTarget} onClose={() => setBaixaTarget(null)} />
      <TransferDialog
        target={transfTarget}
        onClose={() => setTransfTarget(null)}
        almoxList={almoxList}
      />
      <NovaEntradaDialog
        open={entradaOpen}
        onClose={() => setEntradaOpen(false)}
        materiaisList={materiaisList}
        almoxByObra={almoxByObra}
        contasList={contasList}
        fornecedoresList={fornecedoresList}
      />
      <EstoqueItemDetail item={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  )
}
