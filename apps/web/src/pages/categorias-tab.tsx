/**
 * categorias-tab.tsx
 * CategoriasTab extraída de materiais.tsx
 */
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type CategoriaWithCountRow,
  useCategoriasWithCount,
  useCreateCategoria,
  useDeleteCategoria,
  useUpdateCategoria,
} from '@/hooks/use-supabase'
import { accents } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Package, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { useState, useRef } from 'react'
import {
  UNIDADES,
  getUnidadeAbbr,
  getUnidadeLabel,
  itemVariants,
  listVariants,
} from './materiais-tab-constants'

export function CategoriasTab() {
  const { toast } = useToast()
  const { canManageMateriais } = usePermissions()

  const { data: categoriasData, isLoading } = useCategoriasWithCount()
  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()
  const deleteMutation = useDeleteCategoria()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{
    id: string
    nome: string
    unidade: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    nome: string
    count: number
  } | null>(null)

  const cachedEditTarget = useRef(editTarget)
  if (editTarget) cachedEditTarget.current = editTarget
  const activeEdit = editTarget || cachedEditTarget.current

  const cachedDeleteTarget = useRef(deleteTarget)
  if (deleteTarget) cachedDeleteTarget.current = deleteTarget
  const activeDelete = deleteTarget || cachedDeleteTarget.current

  const [newNome, setNewNome] = useState('')
  const [newUnidade, setNewUnidade] = useState('')
  const [editNome, setEditNome] = useState('')
  const [editUnidade, setEditUnidade] = useState('')

  const resetCreate = () => {
    setNewNome('')
    setNewUnidade('')
  }

  const categorias = categoriasData || []

  const unidadeType = (v: string) =>
    (v || 'UN') as
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

  return (
    <>
      {/* ── Top bar ── */}
      <div className="px-4 md:px-8 mt-5 mb-4 flex items-center justify-between">
        <p className="text-[14px] sm:text-[13px] text-muted-foreground">
          {categorias.length === 0
            ? 'Nenhuma categoria'
            : `${categorias.length} categoria${categorias.length !== 1 ? 's' : ''}`}
        </p>
        {canManageMateriais && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Categoria</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        )}
      </div>

      {/* ── Category List ── */}
      <div className="px-4 md:px-8">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-card p-4 animate-pulse flex items-center gap-4"
              >
                <div className="h-10 w-10 bg-muted rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-muted rounded-md" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-6 w-14 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : categorias.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
              style={{ background: 'rgba(0,122,255,0.08)' }}
            >
              <Tag className="h-7 w-7" style={{ color: '#007AFF' }} />
            </div>
            <p className="text-[17px] font-semibold">Nenhuma categoria</p>
            <p className="text-[15px] text-muted-foreground mt-1 mb-6 max-w-xs">
              Crie categorias para organizar seu catálogo de materiais
            </p>
            {canManageMateriais && (
              <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Criar Categoria
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={listVariants}
            className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40"
          >
            {categorias.map((cat: CategoriaWithCountRow, i: number) => {
              const accent = accents[i % accents.length]
              const matCount = cat._count?.materiais ?? 0
              return (
                <motion.div
                  key={cat.id}
                  variants={itemVariants}
                  className="flex items-center gap-4 px-5 py-4 group hover:bg-accent/30 transition-colors duration-150"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ background: accent.bg }}
                  >
                    <Tag className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold leading-snug">{cat.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold font-mono"
                        style={{ background: accent.bg, color: accent.fg }}
                      >
                        {getUnidadeAbbr(cat.unidade)}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {getUnidadeLabel(cat.unidade)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 flex-shrink-0"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                  >
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
                      {matCount}
                    </span>
                  </div>
                  {canManageMateriais && (
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-accent"
                        aria-label={`Editar categoria ${cat.nome}`}
                        onClick={() => {
                          setEditTarget({ id: cat.id, nome: cat.nome, unidade: cat.unidade })
                          setEditNome(cat.nome)
                          setEditUnidade(cat.unidade)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Excluir categoria ${cat.nome}`}
                        onClick={() =>
                          setDeleteTarget({ id: cat.id, nome: cat.nome, count: matCount })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* ── Modal: Nova Categoria ── */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v)
          if (!v) resetCreate()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Organize os materiais em categorias para facilitar a gestão do catálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Nome da Categoria</Label>
              <Input
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                placeholder="Ex: Elétrica, Hidráulica, Pintura..."
                autoFocus
                className="h-11 sm:h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">
                Unidade Sugerida{' '}
                <span className="text-muted-foreground font-normal">
                  (pré-preenche ao criar materiais)
                </span>
              </Label>
              <Select value={newUnidade} onValueChange={setNewUnidade}>
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue placeholder="Selecione a unidade padrão" />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      <span className="flex items-center gap-2.5">
                        <span className="font-mono text-[12px] font-semibold text-muted-foreground w-6">
                          {u.abbr}
                        </span>
                        <span>{u.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false)
                  resetCreate()
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  createMutation.mutate(
                    { nome: newNome.trim(), unidade: unidadeType(newUnidade) },
                    {
                      onSuccess: () => {
                        setCreateOpen(false)
                        resetCreate()
                        toast({ title: 'Categoria criada com sucesso', variant: 'success' })
                      },
                      onError: () => toast({ title: 'Erro ao criar categoria', variant: 'error' }),
                    },
                  )
                }
                disabled={!newNome.trim()}
                loading={createMutation.isPending}
              >
                Criar Categoria
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Editar Categoria ── */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Atualize o nome e a unidade sugerida da categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Nome</Label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="h-11 sm:h-10"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Unidade Sugerida</Label>
              <Select value={editUnidade} onValueChange={setEditUnidade}>
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      <span className="flex items-center gap-2.5">
                        <span className="font-mono text-[12px] font-semibold text-muted-foreground w-6">
                          {u.abbr}
                        </span>
                        <span>{u.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  activeEdit &&
                  updateMutation.mutate(
                    { id: activeEdit.id, nome: editNome.trim(), unidade: unidadeType(editUnidade) },
                    {
                      onSuccess: () => {
                        setEditTarget(null)
                        toast({ title: 'Categoria atualizada', variant: 'success' })
                      },
                      onError: () =>
                        toast({ title: 'Erro ao atualizar categoria', variant: 'error' }),
                    },
                  )
                }
                disabled={!editNome.trim()}
                loading={updateMutation.isPending}
              >
                Salvar Alterações
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmar Exclusão ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              {(activeDelete?.count ?? 0) > 0 ? (
                <>
                  A categoria <strong>{activeDelete?.nome}</strong> possui{' '}
                  <strong>{activeDelete?.count} material(is)</strong> vinculado(s). Remova-os
                  primeiro antes de excluir a categoria.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir <strong>{activeDelete?.nome}</strong>? Essa ação
                  não pode ser desfeita.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {(activeDelete?.count ?? 0) > 0 ? 'Entendido' : 'Cancelar'}
            </Button>
            {(!activeDelete || (activeDelete.count ?? 0) === 0) && (
              <Button
                variant="destructive"
                onClick={() =>
                  activeDelete &&
                  deleteMutation.mutate(activeDelete.id, {
                    onSuccess: () => {
                      setDeleteTarget(null)
                      toast({ title: 'Categoria excluída', variant: 'success' })
                    },
                    onError: () => toast({ title: 'Erro ao excluir categoria', variant: 'error' }),
                  })
                }
                loading={deleteMutation.isPending}
              >
                Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
