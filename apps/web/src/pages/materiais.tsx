import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createMaterialSchema, type CreateMaterialInput } from '@/lib/schemas'
import { type ColumnDef } from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Barcode, Pencil, Tag, Package } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    useMateriais, useCreateMaterial, useDeleteMaterial,
    useCategorias, useCategoriasWithCount,
    useCreateCategoria, useUpdateCategoria, useDeleteCategoria,
} from '@/hooks/use-supabase'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/* ─── Constants ─── */
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

/* Apple-style accent palette for category icons */
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

type TabType = 'materiais' | 'categorias'

/* ════════════════════════════════════════════════════════════
   Main Page — Apple-style Segmented Control
   ════════════════════════════════════════════════════════════ */

export function MateriaisPage() {
    const [activeTab, setActiveTab] = useState<TabType>('materiais')

    return (
        <div className="pb-10">
            {/* ── Header ── */}
            <div className="px-4 md:px-8 pt-10 pb-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Materiais</h1>
                        <p className="text-[15px] sm:text-[13px] text-muted-foreground mt-0.5">
                            Gerencie o catálogo e as categorias
                        </p>
                    </div>
                </div>

                {/* ── Apple Segmented Control ── */}
                <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="inline-flex rounded-xl bg-muted/60 p-1 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('materiais')}
                            className={cn(
                                'flex-1 sm:flex-none relative rounded-[10px] px-5 py-2 text-[14px] sm:text-[13px] font-medium transition-all duration-200',
                                activeTab === 'materiais'
                                    ? 'bg-card text-foreground shadow-sm shadow-black/8'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <Package className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                Materiais
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('categorias')}
                            className={cn(
                                'flex-1 sm:flex-none relative rounded-[10px] px-5 py-2 text-[14px] sm:text-[13px] font-medium transition-all duration-200',
                                activeTab === 'categorias'
                                    ? 'bg-card text-foreground shadow-sm shadow-black/8'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <Tag className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                Categorias
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <AnimatePresence mode="wait">
                {activeTab === 'materiais' ? (
                    <motion.div
                        key="materiais"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                    >
                        <MateriaisTab />
                    </motion.div>
                ) : (
                    <motion.div
                        key="categorias"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                    >
                        <CategoriasTab />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════
   Tab 1 — Materiais (Catálogo)
   ════════════════════════════════════════════════════════════ */

function MateriaisTab() {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)

    /* Quick-add category dialog (inline from material form) */
    const [quickAddCatOpen, setQuickAddCatOpen] = useState(false)
    const [quickCatNome, setQuickCatNome] = useState('')
    const [quickCatUnidade, setQuickCatUnidade] = useState('')

    const { data: materiaisData, isLoading } = useMateriais()
    const { data: categoriasData } = useCategorias()
    const createMutation = useCreateMaterial()
    const deleteMutation = useDeleteMaterial()
    const createCategoriaMutation = useCreateCategoria()

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateMaterialInput>({
        resolver: zodResolver(createMaterialSchema),
        defaultValues: { estoqueMinimo: 0 },
    })

    const selectedCategoriaId = watch('categoriaId')
    const selectedCategoria = (categoriasData || []).find((c: any) => c.id === selectedCategoriaId)

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'codigo', header: 'Código',
            cell: ({ row }) => <span className="font-mono text-[11px] text-muted-foreground">{row.original.codigo}</span>,
        },
        {
            accessorKey: 'nome', header: 'Material',
            cell: ({ row }) => <span className="font-medium text-[13px]">{row.original.nome}</span>,
        },
        {
            accessorKey: 'categoria.nome', header: 'Categoria',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">{row.original.categoria?.nome || '—'}</Badge>
                    <span className="text-[11px] text-muted-foreground">{row.original.categoria?.unidade || ''}</span>
                </div>
            ),
        },
        {
            accessorKey: 'estoque_minimo', header: 'Estoque Mín.',
            cell: ({ row }) => <span className="tabular-nums text-[13px]">{row.original.estoque_minimo ?? 0}</span>,
        },
        {
            accessorKey: 'codigo_barras', header: 'Cód. Barras',
            cell: ({ row }) => row.original.codigo_barras ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Barcode className="h-3 w-3" />
                    <span className="font-mono text-[11px]">{row.original.codigo_barras}</span>
                </div>
            ) : <span className="text-muted-foreground">—</span>,
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: row.original.id, nome: row.original.nome })} className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            ),
        },
    ]

    return (
        <>
            {/* Action bar + instruction */}
            <div className="px-4 md:px-8 mt-5 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground flex-1 mr-3">
                    <span className="flex-shrink-0">📋</span>
                    <span>Cadastre materiais aqui. Para <strong>entrada de estoque</strong> com preço e quantidade, vá em <strong>Estoque → Nova Entrada</strong>.</span>
                </div>
                <Button onClick={() => setOpen(true)} size="sm" className="flex-shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Novo Material</span>
                    <span className="sm:hidden">Novo</span>
                </Button>
            </div>

            {/* Table */}
            <div className="px-4 md:px-8">
                <DataTable columns={columns} data={materiaisData || []} isLoading={isLoading} searchPlaceholder="Buscar materiais..." />
            </div>

            {/* ── Create Material Dialog ── */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Material</DialogTitle>
                        <DialogDescription>Cadastre o material no catálogo. Preço e quantidade são definidos na entrada de estoque.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit((d) => createMutation.mutate({
                        nome: d.nome,
                        codigo: d.codigo,
                        categoria_id: d.categoriaId,
                        estoque_minimo: d.estoqueMinimo || 0,
                        codigo_barras: d.codigoBarras || undefined
                    }, {
                        onSuccess: () => { setOpen(false); reset(); toast({ title: 'Material cadastrado', variant: 'success' }) },
                        onError: () => { toast({ title: 'Erro ao cadastrar', variant: 'error' }) }
                    }))} className="space-y-5">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label>Nome do Material</Label>
                            <Input {...register('nome')} placeholder="Ex: Cimento CP-II 50kg" />
                            {errors.nome && <p className="text-[13px] text-destructive mt-1">{errors.nome.message}</p>}
                        </div>

                        {/* Código */}
                        <div className="space-y-2">
                            <Label>Código</Label>
                            <Input {...register('codigo')} placeholder="Ex: CIM-001" />
                            {errors.codigo && <p className="text-[13px] text-destructive mt-1">{errors.codigo.message}</p>}
                        </div>

                        {/* Categoria — with inline quick-add */}
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select onValueChange={(v) => setValue('categoriaId', v)} value={selectedCategoriaId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                                        <SelectContent>
                                            {(categoriasData || []).map((cat: any) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.nome} ({cat.unidade})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl sm:rounded-lg"
                                    onClick={() => setQuickAddCatOpen(true)}
                                    title="Criar nova categoria"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {errors.categoriaId && <p className="text-[13px] text-destructive mt-1">{errors.categoriaId.message}</p>}
                        </div>

                        {/* Unidade info */}
                        {selectedCategoria && (
                            <div className="flex items-center gap-2 rounded-xl bg-accent/50 px-4 py-3">
                                <span className="text-[14px] sm:text-[13px] text-muted-foreground">Unidade de medida:</span>
                                <span className="text-[14px] sm:text-[13px] font-semibold">{selectedCategoria.unidade}</span>
                            </div>
                        )}

                        {/* Estoque Mínimo + Cód. Barras */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>Estoque Mínimo</Label>
                                <Input type="number" {...register('estoqueMinimo', { valueAsNumber: true })} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <Label>Código de Barras <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                                <Input {...register('codigoBarras')} placeholder="Escaneie ou digite" />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }}>Cancelar</Button>
                            <Button type="submit" loading={createMutation.isPending}>Cadastrar Material</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Quick-Add Category Dialog (inline from material form) ── */}
            <Dialog open={quickAddCatOpen} onOpenChange={(v) => { setQuickAddCatOpen(v); if (!v) { setQuickCatNome(''); setQuickCatUnidade('') } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nova Categoria</DialogTitle>
                        <DialogDescription>Crie rapidamente uma categoria. Ela será selecionada automaticamente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nome da Categoria</Label>
                            <Input
                                value={quickCatNome}
                                onChange={(e) => setQuickCatNome(e.target.value)}
                                placeholder="Ex: Elétrica, Hidráulica, Pintura..."
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unidade de Medida</Label>
                            <Select value={quickCatUnidade} onValueChange={setQuickCatUnidade}>
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
                        {quickCatNome && quickCatUnidade && (
                            <div className="flex items-center gap-3 rounded-xl bg-accent/50 px-4 py-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#007AFF12' }}>
                                    <Tag className="h-4 w-4" style={{ color: '#007AFF' }} />
                                </span>
                                <div>
                                    <p className="text-[14px] sm:text-[13px] font-medium">{quickCatNome}</p>
                                    <p className="text-[12px] text-muted-foreground">Unidade: {getUnidadeLabel(quickCatUnidade)} ({getUnidadeAbbr(quickCatUnidade)})</p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setQuickAddCatOpen(false); setQuickCatNome(''); setQuickCatUnidade('') }}>Cancelar</Button>
                            <Button
                                onClick={() => createCategoriaMutation.mutate({ nome: quickCatNome.trim(), unidade: quickCatUnidade }, {
                                    onSuccess: (data: any) => {
                                        setQuickAddCatOpen(false)
                                        setQuickCatNome('')
                                        setQuickCatUnidade('')
                                        // Auto-select the new category in the material form
                                        if (data?.id) {
                                            setValue('categoriaId', data.id)
                                        }
                                        toast({ title: 'Categoria criada e selecionada', variant: 'success' })
                                    },
                                    onError: () => toast({ title: 'Erro ao criar categoria', variant: 'error' }),
                                })}
                                disabled={!quickCatNome.trim() || !quickCatUnidade}
                                loading={createCategoriaMutation.isPending}
                            >
                                Criar e Selecionar
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Delete Material Dialog ── */}
            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Excluir Material</DialogTitle>
                        <DialogDescription>Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Registros de estoque vinculados também serão removidos. Essa ação não pode ser desfeita.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, {
                            onSuccess: () => { setDeleteTarget(null); toast({ title: 'Material excluído', variant: 'success' }) },
                            onError: () => { toast({ title: 'Erro ao excluir', description: 'Este material pode estar vinculado a registros de estoque.', variant: 'error' }) }
                        })} loading={deleteMutation.isPending}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

/* ════════════════════════════════════════════════════════════
   Tab 2 — Categorias (CRUD)
   ════════════════════════════════════════════════════════════ */

function CategoriasTab() {
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
        <>
            {/* Action bar */}
            <div className="px-4 md:px-8 mt-5 mb-4 flex items-center justify-between">
                <p className="text-[14px] sm:text-[13px] text-muted-foreground">
                    {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} cadastrada{categorias.length !== 1 ? 's' : ''}
                </p>
                <Button onClick={() => setCreateOpen(true)} size="sm" className="flex-shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Nova Categoria</span>
                    <span className="sm:hidden">Nova</span>
                </Button>
            </div>

            {/* Category list */}
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

            {/* ── Create Category Dialog ── */}
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
                                autoFocus
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

            {/* ── Edit Category Dialog ── */}
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
                                autoFocus
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

            {/* ── Delete Category Dialog ── */}
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
        </>
    )
}
