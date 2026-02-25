import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Tag, Package, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategoriasWithCount, useCreateCategoria, useUpdateCategoria, useDeleteCategoria } from '@/hooks/use-supabase'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const UNIDADES = [
    { value: 'UN', label: 'Unidade', abbr: 'un' },
    { value: 'KG', label: 'Quilograma', abbr: 'kg' },
    { value: 'SC', label: 'Saco', abbr: 'sc' },
    { value: 'M', label: 'Metro', abbr: 'm' },
    { value: 'M2', label: 'Metro quadrado', abbr: 'm²' },
    { value: 'M3', label: 'Metro cúbico', abbr: 'm³' },
    { value: 'L', label: 'Litro', abbr: 'L' },
    { value: 'CX', label: 'Caixa', abbr: 'cx' },
    { value: 'PC', label: 'Peça', abbr: 'pç' },
    { value: 'TB', label: 'Tubo', abbr: 'tb' },
    { value: 'GL', label: 'Galão', abbr: 'gl' },
    { value: 'FD', label: 'Fardo', abbr: 'fd' },
    { value: 'RL', label: 'Rolo', abbr: 'rl' },
    { value: 'PR', label: 'Par', abbr: 'pr' },
]

function getUnidadeLabel(value: string) {
    return UNIDADES.find(u => u.value === value)?.label ?? value
}

function getUnidadeAbbr(value: string) {
    return UNIDADES.find(u => u.value === value)?.abbr ?? value
}

/* Accent palette for category icons */
const accents = [
    { bg: '#007AFF12', fg: '#007AFF' },
    { bg: '#34C75912', fg: '#34C759' },
    { bg: '#FF9F0A12', fg: '#FF9F0A' },
    { bg: '#AF52DE12', fg: '#AF52DE' },
    { bg: '#FF375F12', fg: '#FF375F' },
    { bg: '#5AC8FA12', fg: '#5AC8FA' },
    { bg: '#FF634712', fg: '#FF6347' },
    { bg: '#30B0C712', fg: '#30B0C7' },
    { bg: '#FFD60A12', fg: '#B89B00' },
    { bg: '#00C7BE12', fg: '#00C7BE' },
]

export function CategoriasPage() {
    const { toast } = useToast()

    /* Queries */
    const { data: categoriasData, isLoading } = useCategoriasWithCount()
    const createMutation = useCreateCategoria()
    const updateMutation = useUpdateCategoria()
    const deleteMutation = useDeleteCategoria()

    /* Dialog states */
    const [createOpen, setCreateOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<{ id: string; nome: string; unidade: string } | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string; count: number } | null>(null)

    /* Create form */
    const [newNome, setNewNome] = useState('')
    const [newUnidade, setNewUnidade] = useState('')

    /* Edit form */
    const [editNome, setEditNome] = useState('')
    const [editUnidade, setEditUnidade] = useState('')

    const resetCreate = () => { setNewNome(''); setNewUnidade('') }

    const categorias = categoriasData || []

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Categorias</h1>
                    <p className="text-[15px] sm:text-[13px] text-muted-foreground mt-0.5">
                        {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} cadastrada{categorias.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />Nova Categoria
                </Button>
            </div>

            {/* Content */}
            <div className="px-4 md:px-8">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-xl border bg-card p-5 animate-pulse flex items-center gap-4">
                                <div className="h-10 w-10 bg-muted rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-36 bg-muted rounded-lg" />
                                    <div className="h-3 w-20 bg-muted rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : categorias.length === 0 ? (
                    <div className="text-center py-20">
                        <Tag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-[17px] font-medium text-muted-foreground">Nenhuma categoria</p>
                        <p className="text-[15px] text-muted-foreground/70 mt-1 mb-6">Crie categorias para organizar seus materiais</p>
                        <Button onClick={() => setCreateOpen(true)} size="sm">
                            <Plus className="h-4 w-4 mr-1.5" />Criar Categoria
                        </Button>
                    </div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
                        className="rounded-xl border bg-card overflow-hidden"
                    >
                        <ul className="divide-y divide-border/50">
                            {categorias.map((cat: any, i: number) => {
                                const accent = accents[i % accents.length]
                                const matCount = cat._count?.materiais ?? 0
                                return (
                                    <motion.li
                                        key={cat.id}
                                        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                                        className="flex items-center gap-4 px-5 py-4 group"
                                    >
                                        {/* Icon */}
                                        <span
                                            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                                            style={{ backgroundColor: accent.bg }}
                                        >
                                            <Tag className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
                                        </span>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] sm:text-[14px] font-semibold truncate">{cat.nome}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="secondary" className="text-[11px]">{getUnidadeAbbr(cat.unidade)}</Badge>
                                                <span className="text-[12px] text-muted-foreground">
                                                    {getUnidadeLabel(cat.unidade)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Material count */}
                                        <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0 mr-2">
                                            <Package className="h-3.5 w-3.5" />
                                            <span className="text-[13px] tabular-nums font-medium">{matCount}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
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
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteTarget({ id: cat.id, nome: cat.nome, count: matCount })}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </motion.li>
                                )
                            })}
                        </ul>
                    </motion.div>
                )}
            </div>

            {/* ── Create Dialog ── */}
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreate() }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nova Categoria</DialogTitle>
                        <DialogDescription>Crie uma categoria para organizar os materiais do catálogo.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nome da Categoria</Label>
                            <Input
                                value={newNome}
                                onChange={(e) => setNewNome(e.target.value)}
                                placeholder="Ex: Elétrica, Hidráulica, Pintura..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unidade de Medida Padrão</Label>
                            <Select value={newUnidade} onValueChange={setNewUnidade}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIDADES.map(u => (
                                        <SelectItem key={u.value} value={u.value}>
                                            {u.label} ({u.abbr})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preview */}
                        {newNome && newUnidade && (
                            <div className="flex items-center gap-3 rounded-xl bg-accent/50 px-4 py-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#007AFF12' }}>
                                    <Tag className="h-4 w-4" style={{ color: '#007AFF' }} />
                                </span>
                                <div>
                                    <p className="text-[14px] sm:text-[13px] font-medium">{newNome}</p>
                                    <p className="text-[12px] text-muted-foreground">Unidade: {getUnidadeLabel(newUnidade)} ({getUnidadeAbbr(newUnidade)})</p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreate() }}>Cancelar</Button>
                            <Button
                                onClick={() => createMutation.mutate({ nome: newNome.trim(), unidade: newUnidade }, {
                                    onSuccess: () => {
                                        setCreateOpen(false)
                                        resetCreate()
                                        toast({ title: 'Categoria criada', variant: 'success' })
                                    },
                                    onError: () => toast({ title: 'Erro ao criar categoria', variant: 'error' }),
                                })}
                                disabled={!newNome.trim() || !newUnidade}
                                loading={createMutation.isPending}
                            >
                                Criar Categoria
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ── */}
            <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Categoria</DialogTitle>
                        <DialogDescription>Altere o nome ou a unidade de medida da categoria.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nome da Categoria</Label>
                            <Input
                                value={editNome}
                                onChange={(e) => setEditNome(e.target.value)}
                                placeholder="Nome da categoria"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unidade de Medida Padrão</Label>
                            <Select value={editUnidade} onValueChange={setEditUnidade}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIDADES.map(u => (
                                        <SelectItem key={u.value} value={u.value}>
                                            {u.label} ({u.abbr})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
                            <Button
                                onClick={() => editTarget && updateMutation.mutate({
                                    id: editTarget.id,
                                    nome: editNome.trim(),
                                    unidade: editUnidade,
                                }, {
                                    onSuccess: () => {
                                        setEditTarget(null)
                                        toast({ title: 'Categoria atualizada', variant: 'success' })
                                    },
                                    onError: () => toast({ title: 'Erro ao atualizar', variant: 'error' }),
                                })}
                                disabled={!editNome.trim() || !editUnidade}
                                loading={updateMutation.isPending}
                            >
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Delete Dialog ── */}
            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Excluir Categoria</DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.count && deleteTarget.count > 0 ? (
                                <>Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Existem <strong>{deleteTarget?.count} materiais</strong> vinculados a esta categoria. Essa ação não pode ser desfeita.</>
                            ) : (
                                <>Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Essa ação não pode ser desfeita.</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, {
                                onSuccess: () => {
                                    setDeleteTarget(null)
                                    toast({ title: 'Categoria excluída', variant: 'success' })
                                },
                                onError: () => toast({
                                    title: 'Erro ao excluir',
                                    description: 'Esta categoria pode ter materiais vinculados.',
                                    variant: 'error',
                                }),
                            })}
                            loading={deleteMutation.isPending}
                        >
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
