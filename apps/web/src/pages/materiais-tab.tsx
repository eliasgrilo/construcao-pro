/**
 * materiais-tab.tsx
 * MateriaisTab extraído de materiais.tsx
 * Dialogs delegados a materiais-tab-dialogs.tsx
 */
import { QueryError } from '@/components/ui/query-error'
import { usePermissions } from '@/hooks/use-permissions'
import { type MaterialRow, useMateriais } from '@/hooks/use-supabase'
import { useCallback, useMemo, useState } from 'react'
import { MateriaisTabContent } from './materiais-tab-content'
import {
  MateriaisCreateDialog,
  MateriaisDeleteDialog,
  MateriaisEditDialog,
  type MateriaisEditTarget,
  QuickAddCategoriaDialog,
} from './materiais-tab-dialogs'

export {
  UNIDADES,
  getUnidadeAbbr,
  getUnidadeLabel,
  itemVariants,
  listVariants,
} from './materiais-tab-constants'

export function MateriaisTab({
  searchQuery,
  onClearSearch,
}: { searchQuery: string; onClearSearch: () => void }) {
  const { canManageMateriais } = usePermissions()
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
  const [editTarget, setEditTarget] = useState<MateriaisEditTarget | null>(null)
  const [quickAddCatOpen, setQuickAddCatOpen] = useState(false)
  const [pendingCategory, setPendingCategory] = useState<{ id: string; unidade: string } | null>(
    null,
  )

  const { data: materiaisData = [], isLoading, isError, refetch } = useMateriais()

  const openEditDialog = useCallback((m: MaterialRow) => {
    setEditTarget({
      id: m.id,
      nome: m.nome,
      codigo: m.codigo ?? '',
      categoriaId: m.categoria?.id,
      unidade: m.unidade || m.categoria?.unidade || 'UN',
      estoqueMinimo: m.estoque_minimo ?? 0,
    })
  }, [])

  const filteredMateriais = useMemo(() => {
    if (!searchQuery) return materiaisData
    const q = searchQuery.toLowerCase()
    return materiaisData.filter(
      (m: MaterialRow) =>
        m.nome?.toLowerCase().includes(q) ||
        m.codigo?.toLowerCase().includes(q) ||
        m.categoria?.nome?.toLowerCase().includes(q),
    )
  }, [materiaisData, searchQuery])

  const groupedMateriais = useMemo<Record<string, MaterialRow[]>>(() => {
    const groups: Record<string, MaterialRow[]> = {}
    for (const m of filteredMateriais) {
      const catName = m.categoria?.nome || 'Sem Categoria'
      if (!groups[catName]) groups[catName] = []
      groups[catName].push(m)
    }
    return groups
  }, [filteredMateriais])

  if (isError) {
    return <QueryError onRetry={() => void refetch()} />
  }

  return (
    <>
      <MateriaisTabContent
        canManageMateriais={canManageMateriais}
        filteredMateriais={filteredMateriais}
        groupedMateriais={groupedMateriais}
        isLoading={isLoading}
        onClearSearch={onClearSearch}
        onDelete={setDeleteTarget}
        onEdit={openEditDialog}
        onOpenCreate={() => setOpen(true)}
        searchQuery={searchQuery}
      />

      <MateriaisCreateDialog
        open={open}
        onClose={() => setOpen(false)}
        onRequestQuickAddCat={() => {
          setOpen(false)
          setQuickAddCatOpen(true)
        }}
        pendingCategory={pendingCategory}
        onPendingCategoryApplied={() => setPendingCategory(null)}
      />

      <MateriaisEditDialog editTarget={editTarget} onClose={() => setEditTarget(null)} />

      <MateriaisDeleteDialog deleteTarget={deleteTarget} onClose={() => setDeleteTarget(null)} />

      <QuickAddCategoriaDialog
        open={quickAddCatOpen}
        onClose={() => setQuickAddCatOpen(false)}
        onCreated={(id, unidade) => {
          setPendingCategory({ id, unidade })
          setTimeout(() => setOpen(true), 200)
        }}
      />
    </>
  )
}
