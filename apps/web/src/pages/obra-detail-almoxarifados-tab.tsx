import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import { useCreateAlmoxarifado, useDeleteAlmoxarifado } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, Package, Plus, Search, Trash2, Warehouse, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Almoxarifado, BaixaTarget, DeleteEstoqueTarget, EstoqueItem } from './obra-detail'
import { Empty, ObraDetailAlmoxarifadoCard, ObraDetailAlmoxarifadoItem } from './obra-detail'

interface CreateAlmoxProps {
  createAlmoxOpen: boolean
  setCreateAlmoxOpen: (open: boolean) => void
  newAlmoxName: string
  setNewAlmoxName: (name: string) => void
  createAlmox: ReturnType<typeof useCreateAlmoxarifado>
  obraId: string
  toast: ReturnType<typeof useToast>['toast']
}

function AlmoxarifadoCreateDialog({
  createAlmoxOpen,
  setCreateAlmoxOpen,
  newAlmoxName,
  setNewAlmoxName,
  createAlmox,
  obraId,
  toast,
}: CreateAlmoxProps) {
  return (
    <Dialog
      open={createAlmoxOpen}
      onOpenChange={(v) => {
        if (!v && !createAlmox.isPending) setCreateAlmoxOpen(false)
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Local de Construção</DialogTitle>
          <DialogDescription>
            Crie um novo local (ex: Almoxarifado Principal, Frente A) para alocar os materiais desta
            obra.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="almoxNome" className="mb-2 block text-[13px]">
            Nome do local
          </Label>
          <Input
            id="almoxNome"
            placeholder="Ex: Depósito Central"
            value={newAlmoxName}
            onChange={(e) => setNewAlmoxName(e.target.value)}
            className="text-[14px]"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCreateAlmoxOpen(false)
              setNewAlmoxName('')
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!newAlmoxName.trim()}
            loading={createAlmox.isPending}
            onClick={() => {
              createAlmox.mutate(
                { obra_id: obraId, nome: newAlmoxName.trim() },
                {
                  onSuccess: () => {
                    toast({ title: 'Local criado com sucesso!', variant: 'success' })
                    setCreateAlmoxOpen(false)
                    setNewAlmoxName('')
                  },
                  onError: (err: Error) => {
                    toast({
                      title: 'Erro ao criar local',
                      description: err?.message,
                      variant: 'error',
                    })
                  },
                },
              )
            }}
          >
            Criar Local
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteAlmoxProps {
  deleteTarget: { id: string; nome: string } | null
  setDeleteTarget: React.Dispatch<React.SetStateAction<{ id: string; nome: string } | null>>
  deleteAlmox: ReturnType<typeof useDeleteAlmoxarifado>
  setSelectedAlmox: React.Dispatch<React.SetStateAction<{ id: string; nome: string } | null>>
  toast: ReturnType<typeof useToast>['toast']
}

function AlmoxarifadoDeleteDialog({
  deleteTarget,
  setDeleteTarget,
  deleteAlmox,
  setSelectedAlmox,
  toast,
}: DeleteAlmoxProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Excluir Local</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o local{' '}
            <strong className="text-foreground">{deleteTarget?.nome}</strong>? Esta ação não pode
            ser desfeita. Todos os materiais devem ser transferidos ou zerados primeiro.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={deleteAlmox.isPending}
            onClick={() => {
              if (!deleteTarget) return
              deleteAlmox.mutate(deleteTarget.id, {
                onSuccess: () => {
                  toast({ title: 'Local excluído com sucesso!', variant: 'success' })
                  setDeleteTarget(null)
                  setSelectedAlmox(null)
                },
                onError: (err: Error) => {
                  toast({
                    title: 'Erro ao excluir local',
                    description: err?.message || 'Verifique se o local contém materiais alocados.',
                    variant: 'error',
                  })
                },
              })
            }}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export interface ObraDetailAlmoxarifadosTabProps {
  obraId: string
  almoxarifados: Almoxarifado[]
  estoque: EstoqueItem[]
  setEntAlmoxId: (val: string) => void
  setEntradaDialog: (val: boolean) => void
  setBaixaTarget: (val: BaixaTarget) => void
  setMovTipo: (val: string) => void
  setMovAlmoxId: (id: string) => void
  setMovMaterialId: (id: string) => void
  setMovDialog: (val: boolean) => void
  setDeleteEstoqueTarget: (val: DeleteEstoqueTarget) => void
}
export function ObraDetailAlmoxarifadosTab({
  obraId,
  almoxarifados,
  estoque,
  setEntAlmoxId,
  setEntradaDialog,
  setBaixaTarget,
  setMovTipo,
  setMovAlmoxId,
  setMovMaterialId,
  setMovDialog,
  setDeleteEstoqueTarget,
}: ObraDetailAlmoxarifadosTabProps) {
  const { toast } = useToast()
  const { canManageEstoque } = usePermissions()

  // Local State
  const [selectedAlmox, setSelectedAlmox] = useState<{ id: string; nome: string } | null>(null)
  const [almoxSearch, setAlmoxSearch] = useState('')
  const [almoxFilter, setAlmoxFilter] = useState<string | null>(null)

  // Modals Local State
  const [createAlmoxOpen, setCreateAlmoxOpen] = useState(false)
  const [newAlmoxName, setNewAlmoxName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)

  // Mutations
  const createAlmox = useCreateAlmoxarifado()
  const deleteAlmox = useDeleteAlmoxarifado()

  // Memoized filter calculations for the selected almoxarifado detail view
  const aEstoque = useMemo(
    () => estoque.filter((e) => e.almoxarifado?.id === selectedAlmox?.id),
    [estoque, selectedAlmox],
  )

  const categories = useMemo(
    () =>
      Array.from(
        new Set(aEstoque.map((e) => e.material?.categoria?.nome).filter(Boolean)),
      ) as string[],
    [aEstoque],
  )

  const filteredEstoque = useMemo(() => {
    return aEstoque.filter((e) => {
      const matchSearch =
        !almoxSearch ||
        (e.material?.nome ?? '').toLowerCase().includes(almoxSearch.toLowerCase()) ||
        (e.material?.codigo ?? '').toLowerCase().includes(almoxSearch.toLowerCase())
      const matchFilter = !almoxFilter || e.material?.categoria?.nome === almoxFilter
      return matchSearch && matchFilter
    })
  }, [aEstoque, almoxSearch, almoxFilter])

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {!selectedAlmox ? (
          /* ══ NÍVEL 1: Lista de locais de construção ══ */
          <motion.div
            key="almox-list"
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -16, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold">Locais desta obra</h2>
              {canManageEstoque && (
                <Button size="sm" onClick={() => setCreateAlmoxOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Novo
                </Button>
              )}
            </div>

            {almoxarifados.length === 0 ? (
              <Empty
                icon={Warehouse}
                text="Nenhum local de construção"
                sub="Adicione um local para gerenciar o estoque desta obra."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {almoxarifados.map((a) => (
                  <ObraDetailAlmoxarifadoCard
                    key={a.id}
                    a={a}
                    estoque={estoque}
                    setSelectedAlmox={setSelectedAlmox}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* ══ NÍVEL 2: Detalhe do local selecionado ══ */
          <motion.div
            key={`almox-detail-${selectedAlmox.id}`}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Breadcrumb header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAlmox(null)
                    setAlmoxSearch('')
                    setAlmoxFilter(null)
                  }}
                  className="flex items-center gap-1 text-[13px] text-primary font-medium hover:opacity-70 transition-opacity flex-shrink-0"
                >
                  <ArrowLeft className="h-[14px] w-[14px]" />
                  Construção
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                <span className="text-[13px] font-semibold truncate">{selectedAlmox.nome}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {canManageEstoque && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({ id: selectedAlmox.id, nome: selectedAlmox.nome ?? '' })
                    }
                    className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                    aria-label="Excluir local"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {canManageEstoque && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEntAlmoxId(selectedAlmox.id)
                      setEntradaDialog(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo Item
                  </Button>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar material..."
                value={almoxSearch}
                onChange={(e) => setAlmoxSearch(e.target.value)}
                className="w-full h-9 rounded-xl border bg-accent/30 pl-9 pr-9 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
              />
              {almoxSearch && (
                <button
                  type="button"
                  onClick={() => setAlmoxSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-5 sm:w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
                  aria-label="Limpar busca"
                >
                  <X className="h-3 w-3 sm:h-2.5 sm:w-2.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Category filter pills */}
            {categories.length >= 2 && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-0.5 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setAlmoxFilter(null)}
                  className={cn(
                    'flex-shrink-0 h-9 sm:h-7 px-4 sm:px-3 rounded-full text-[13px] sm:text-[12px] font-medium transition-all',
                    almoxFilter === null
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAlmoxFilter(almoxFilter === cat ? null : cat)}
                    className={cn(
                      'flex-shrink-0 h-9 sm:h-7 px-4 sm:px-3 rounded-full text-[13px] sm:text-[12px] font-medium transition-all whitespace-nowrap',
                      almoxFilter === cat
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Stock items list */}
            {aEstoque.length === 0 ? (
              <Empty
                icon={Package}
                text="Sem itens no estoque"
                sub="Toque em + Novo Item para adicionar o primeiro material."
              />
            ) : filteredEstoque.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-[14px] font-medium text-muted-foreground">Nenhum resultado</p>
                <p className="text-[12px] text-muted-foreground/60 mt-1">
                  Tente outro termo ou remova o filtro.
                </p>
              </div>
            ) : (
              <div>
                {/* Column header — desktop only */}
                <div className="hidden sm:flex items-center px-4 mb-1 gap-3">
                  <div className="w-9 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      Material
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 w-14">
                    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      Quantidade
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 w-20">
                    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      Custo Unitário
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 w-20">
                    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      Total
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-[88px]" />
                </div>

                <div className="space-y-1.5">
                  {filteredEstoque.map((e) => (
                    <ObraDetailAlmoxarifadoItem
                      key={e.id}
                      e={e}
                      setBaixaTarget={setBaixaTarget}
                      setMovTipo={setMovTipo}
                      setMovAlmoxId={setMovAlmoxId}
                      setMovMaterialId={setMovMaterialId}
                      setMovDialog={setMovDialog}
                      setDeleteEstoqueTarget={setDeleteEstoqueTarget}
                    />
                  ))}
                </div>

                {/* Summary footer */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-accent/30 border border-border/40 mt-2">
                  <p className="text-[12px] text-muted-foreground">
                    {filteredEstoque.length}{' '}
                    {filteredEstoque.length === 1 ? 'item no estoque' : 'itens no estoque'}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[13px] font-semibold tabular-nums">
                        {formatCurrency(
                          filteredEstoque.reduce(
                            (s: number, item) =>
                              s + (item.quantidade ?? 0) * (item.material?.preco_unitario ?? 0),
                            0,
                          ),
                        )}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        Valor total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AlmoxarifadoCreateDialog
        createAlmoxOpen={createAlmoxOpen}
        setCreateAlmoxOpen={setCreateAlmoxOpen}
        newAlmoxName={newAlmoxName}
        setNewAlmoxName={setNewAlmoxName}
        createAlmox={createAlmox}
        obraId={obraId}
        toast={toast}
      />

      <AlmoxarifadoDeleteDialog
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleteAlmox={deleteAlmox}
        setSelectedAlmox={setSelectedAlmox}
        toast={toast}
      />
    </>
  )
}
