import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertTriangle, Boxes, Building2, Package,
    ArrowLeft, Plus, PackagePlus, Minus, ArrowRightLeft, Trash2,
} from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    useEstoque, useEstoqueAlertas, useMateriais, useAlmoxarifados, useFornecedores,
    useCreateMovimentacaoEntrada, useCreateMovimentacaoSaida, useCreateMovimentacaoTransferencia,
} from '@/hooks/use-supabase'
import { cn, formatNumber, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

/* ── Types ── */
interface ObraGroup {
    obraId: string
    obraNome: string
    items: any[]
    totalItems: number
    totalQty: number
    totalCost: number
    lowStockCount: number
    almoxarifados: number
}

/* ── Accent palette ── */
const accents = [
    { bg: '#007AFF10', fg: '#007AFF' },
    { bg: '#34C75910', fg: '#34C759' },
    { bg: '#FF9F0A10', fg: '#FF9F0A' },
    { bg: '#AF52DE10', fg: '#AF52DE' },
    { bg: '#FF375F10', fg: '#FF375F' },
    { bg: '#5AC8FA10', fg: '#5AC8FA' },
    { bg: '#FF634710', fg: '#FF6347' },
    { bg: '#30B0C710', fg: '#30B0C7' },
]

export function EstoquePage() {
    const { toast } = useToast()
    const [selectedObra, setSelectedObra] = useState<string | null>(null)
    const [entradaOpen, setEntradaOpen] = useState(false)

    /* ── Entry form state ── */
    const [entMaterialId, setEntMaterialId] = useState('')
    const [entQty, setEntQty] = useState('')
    const [entPreco, setEntPreco] = useState('')
    const [entUnidade, setEntUnidade] = useState('')
    const [entPagamento, setEntPagamento] = useState('')
    const [entAlmoxId, setEntAlmoxId] = useState('')
    const [entFornecedorId, setEntFornecedorId] = useState('')
    const [entObs, setEntObs] = useState('')

    const resetEntrada = () => {
        setEntMaterialId(''); setEntQty(''); setEntPreco(''); setEntUnidade(''); setEntPagamento('');
        setEntAlmoxId(''); setEntFornecedorId(''); setEntObs('')
    }

    /* ── Dar Baixa (saída rápida) ── */
    const [baixaTarget, setBaixaTarget] = useState<{
        materialId: string
        materialNome: string
        materialCodigo: string
        almoxarifadoId: string
        almoxarifadoNome: string
        obraNome: string
        quantidadeDisponivel: number
        unidade: string
        precoUnitario: number
    } | null>(null)
    const [baixaQty, setBaixaQty] = useState('')
    const [baixaObs, setBaixaObs] = useState('')

    /* ── Transfer state ── */
    const [transfTarget, setTransfTarget] = useState<{
        materialId: string
        materialNome: string
        almoxarifadoId: string
        almoxarifadoNome: string
    } | null>(null)
    const [transfDestinoId, setTransfDestinoId] = useState('')
    const [transfQty, setTransfQty] = useState('')

    /* ── Zerar estoque (registra saída total) ── */
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string
        materialId: string
        materialNome: string
        almoxarifadoId: string
        almoxarifadoNome: string
        quantidade: number
        unidade: string
        precoUnitario: number
    } | null>(null)

    /* ── Queries ── */
    const { data: estoqueData, isLoading } = useEstoque()
    const { data: alertasData } = useEstoqueAlertas()
    const { data: materiaisData } = useMateriais()
    const { data: almoxData } = useAlmoxarifados()
    const { data: fornecedoresData } = useFornecedores()

    /* ── Mutations ── */
    const createEntrada = useCreateMovimentacaoEntrada()
    const createSaida = useCreateMovimentacaoSaida()
    const createTransferencia = useCreateMovimentacaoTransferencia()

    const allItems = estoqueData || []
    const alertCount = (alertasData || []).length
    const materiaisList = materiaisData || []
    const almoxList = almoxData || []
    const fornecedoresList = fornecedoresData || []

    /* ── Almoxarifados grouped by obra ── */
    const almoxByObra = useMemo(() => {
        const map = new Map<string, { obraNome: string; almoxs: any[] }>()
        for (const a of almoxList) {
            const obraNome = a.obra?.nome || 'Sem Obra'
            const obraId = a.obra?.id || 'sem-obra'
            if (!map.has(obraId)) map.set(obraId, { obraNome, almoxs: [] })
            map.get(obraId)!.almoxs.push(a)
        }
        return Array.from(map.entries()).sort((a, b) => a[1].obraNome.localeCompare(b[1].obraNome))
    }, [almoxList])

    /* ── Selected material info ── */
    const selectedMaterial = materiaisList.find((m: any) => m.id === entMaterialId)

    /* ── Group stock by obra ── */
    const { obraGroups, totals } = useMemo(() => {
        const map = new Map<string, ObraGroup>()
        for (const item of allItems) {
            const obraId = item.almoxarifado?.obra?.id || 'sem-obra'
            const obraNome = item.almoxarifado?.obra?.nome || 'Sem Obra'
            if (!map.has(obraId)) {
                map.set(obraId, {
                    obraId, obraNome, items: [], totalItems: 0, totalQty: 0, totalCost: 0,
                    lowStockCount: 0, almoxarifados: 0,
                })
            }
            const group = map.get(obraId)!
            group.items.push(item)
            group.totalItems++
            group.totalQty += item.quantidade ?? 0
            group.totalCost += (item.quantidade ?? 0) * (item.material?.preco_unitario ?? 0)
            const min = item.material?.estoque_minimo || 0
            if (min > 0 && (item.quantidade ?? 0) <= min) group.lowStockCount++
        }
        for (const group of map.values()) {
            const uniqueAlmox = new Set(group.items.map((i: any) => i.almoxarifado?.id).filter(Boolean))
            group.almoxarifados = uniqueAlmox.size
        }
        const groups = Array.from(map.values()).sort((a, b) => a.obraNome.localeCompare(b.obraNome))
        const totals = {
            items: allItems.length,
            qty: allItems.reduce((s: number, i: any) => s + (i.quantidade ?? 0), 0),
            cost: allItems.reduce((s: number, i: any) => s + (i.quantidade ?? 0) * (i.material?.preco_unitario ?? 0), 0),
            obras: groups.length,
            lowStock: alertCount,
        }
        return { obraGroups: groups, totals }
    }, [allItems, alertCount])

    const selectedGroup = selectedObra ? obraGroups.find(g => g.obraId === selectedObra) : null

    /* ── Dar Baixa handler ── */
    const handleDarBaixa = () => {
        if (!baixaTarget || !baixaQty) return
        createSaida.mutate({
            p_material_id: baixaTarget.materialId,
            p_quantidade: Number(baixaQty),
            p_preco_unitario: baixaTarget.precoUnitario,
            p_almoxarifado_id: baixaTarget.almoxarifadoId,
            p_observacao: baixaObs.trim() || undefined,
        }, {
            onSuccess: () => {
                toast({
                    title: 'Baixa registrada',
                    description: `${baixaQty} ${baixaTarget.unidade} de ${baixaTarget.materialNome} retirados`,
                    variant: 'success',
                })
                setBaixaTarget(null)
                setBaixaQty('')
                setBaixaObs('')
            },
            onError: () => toast({ title: 'Erro ao registrar baixa', description: 'Verifique a quantidade disponível.', variant: 'error' }),
        })
    }

    /* ── Transfer handler ── */
    const handleTransfer = () => {
        if (!transfTarget || !transfQty || !transfDestinoId) return
        createTransferencia.mutate({
            p_material_id: transfTarget.materialId,
            p_quantidade: Number(transfQty),
            p_almoxarifado_id: transfTarget.almoxarifadoId,
            p_almoxarifado_destino_id: transfDestinoId,
        }, {
            onSuccess: () => {
                toast({ title: 'Transferência solicitada', description: 'Aguardando aprovação.', variant: 'success' })
                setTransfTarget(null)
                setTransfQty('')
                setTransfDestinoId('')
            },
            onError: () => toast({ title: 'Erro ao transferir', variant: 'error' }),
        })
    }

    /* ── Helper to open baixa from any item ── */
    const openBaixa = (item: any) => {
        setBaixaTarget({
            materialId: item.material?.id,
            materialNome: item.material?.nome ?? '—',
            materialCodigo: item.material?.codigo ?? '',
            almoxarifadoId: item.almoxarifado?.id,
            almoxarifadoNome: item.almoxarifado?.nome ?? '—',
            obraNome: item.almoxarifado?.obra?.nome ?? '—',
            quantidadeDisponivel: item.quantidade ?? 0,
            unidade: item.material?.categoria?.unidade ?? 'UN',
            precoUnitario: item.material?.preco_unitario ?? 0,
        })
    }

    /* ── Helper to open transfer from any item ── */
    const openTransfer = (item: any) => {
        setTransfTarget({
            materialId: item.material?.id,
            materialNome: item.material?.nome ?? '—',
            almoxarifadoId: item.almoxarifado?.id,
            almoxarifadoNome: item.almoxarifado?.nome ?? '—',
        })
    }

    /* ── Table columns WITH actions ── */
    const makeColumns = (showObra: boolean): ColumnDef<any>[] => {
        const base: ColumnDef<any>[] = [
            {
                accessorKey: 'material.nome', header: 'Material',
                cell: ({ row }) => (
                    <div>
                        <span className="font-medium text-[13px]">{row.original.material?.nome || '—'}</span>
                        <p className="text-[11px] text-muted-foreground font-mono">{row.original.material?.codigo || ''}</p>
                    </div>
                ),
            },
            {
                accessorKey: 'material.categoria.nome', header: 'Categoria',
                cell: ({ row }) => <Badge variant="secondary">{row.original.material?.categoria?.nome || '—'}</Badge>,
            },
            {
                accessorKey: 'almoxarifado.nome', header: 'Almoxarifado',
                cell: ({ row }) => <span className="text-[13px]">{row.original.almoxarifado?.nome || '—'}</span>,
            },
        ]

        if (showObra) {
            base.push({
                accessorKey: 'almoxarifado.obra.nome', header: 'Obra',
                cell: ({ row }) => <span className="text-[13px] text-muted-foreground">{row.original.almoxarifado?.obra?.nome || '—'}</span>,
            })
        }

        base.push(
            {
                accessorKey: 'quantidade', header: 'Qtd.',
                cell: ({ row }) => {
                    const qty = row.original.quantidade ?? 0
                    const min = row.original.material?.estoque_minimo || 0
                    const isLow = min > 0 && qty <= min
                    return (
                        <div className="flex items-center gap-1.5">
                            <span className={cn('font-semibold tabular-nums text-[13px]', isLow && 'text-destructive')}>{formatNumber(qty)}</span>
                            {isLow && <AlertTriangle className="h-3 w-3 text-warning" />}
                        </div>
                    )
                },
            },
            {
                id: 'custoUnitario', header: 'Custo Un.',
                cell: ({ row }) => <span className="tabular-nums text-[13px]">{formatCurrency(row.original.material?.preco_unitario ?? 0)}</span>,
            },
            {
                id: 'valorTotal', header: 'Total',
                cell: ({ row }) => {
                    const total = (row.original.quantidade ?? 0) * (row.original.material?.preco_unitario ?? 0)
                    return <span className="font-semibold tabular-nums text-[13px]">{formatCurrency(total)}</span>
                },
            },
            {
                id: 'actions', header: '',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1 justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-[12px] border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
                            onClick={() => openBaixa(row.original)}
                        >
                            <Minus className="h-3 w-3 mr-1" />
                            Baixa
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground hover:text-primary"
                            title="Transferir"
                            onClick={() => openTransfer(row.original)}
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                            title="Remover do estoque"
                            onClick={() => setDeleteTarget({
                                id: row.original.id,
                                materialId: row.original.material?.id,
                                materialNome: row.original.material?.nome ?? '—',
                                almoxarifadoId: row.original.almoxarifado?.id,
                                almoxarifadoNome: row.original.almoxarifado?.nome ?? '—',
                                quantidade: row.original.quantidade ?? 0,
                                unidade: row.original.material?.categoria?.unidade ?? 'UN',
                                precoUnitario: row.original.material?.preco_unitario ?? 0,
                            })}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ),
            },
        )

        return base
    }

    /* ── Loading ── */
    if (isLoading) {
        return (
            <div className="pb-10">
                <div className="px-4 md:px-8 pt-10 pb-6">
                    <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
                    <div className="h-4 w-56 bg-muted rounded-lg animate-pulse mt-2" />
                </div>
                <div className="px-4 md:px-8 space-y-4">
                    <div className="rounded-[20px] bg-card border h-[160px] animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-[20px] bg-card border h-[140px] animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const canSubmitEntrada = entMaterialId && entQty && Number(entQty) > 0 && entAlmoxId && entUnidade && entPagamento

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Estoque</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">Visão geral por obra e almoxarifado</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setEntradaOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-1.5" />Nova Entrada
                    </Button>
                </div>
            </div>

            <div className="px-4 md:px-8">
                <AnimatePresence mode="wait">
                    {!selectedObra ? (
                        <motion.div
                            key="cards"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-8"
                        >
                            {/* ═══════ HERO — Estoque Geral ═══════ */}
                            <motion.button
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                onClick={() => setSelectedObra('__all__')}
                                className="w-full text-left rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] p-6 md:p-8 transition-transform active:scale-[0.98] group"
                            >
                                <div className="flex items-start gap-4">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
                                        <Boxes className="h-6 w-6 text-white" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Estoque Geral</p>
                                        <p className="text-[32px] md:text-[40px] font-bold tabular-nums tracking-tight leading-none mt-2">
                                            {formatCurrency(totals.cost)}
                                        </p>
                                        <p className="text-[15px] text-muted-foreground mt-2">em materiais</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-6">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1.5 text-[12px] font-medium">
                                        <Package className="h-3 w-3 text-muted-foreground" />
                                        {formatNumber(totals.items)} itens
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1.5 text-[12px] font-medium">
                                        <Building2 className="h-3 w-3 text-muted-foreground" />
                                        {totals.obras} obra{totals.obras !== 1 ? 's' : ''}
                                    </span>
                                    {totals.lowStock > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 text-warning px-3 py-1.5 text-[12px] font-medium">
                                            <AlertTriangle className="h-3 w-3" />
                                            {totals.lowStock} alerta{totals.lowStock !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </motion.button>

                            {/* ═══════ OBRA CARDS ═══════ */}
                            {obraGroups.length > 0 && (
                                <>
                                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Por Obra</h3>
                                    <motion.div
                                        initial="hidden"
                                        animate="show"
                                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                                    >
                                        {obraGroups.map((group, i) => {
                                            const accent = accents[i % accents.length]
                                            return (
                                                <motion.button
                                                    key={group.obraId}
                                                    variants={{
                                                        hidden: { opacity: 0, y: 16 },
                                                        show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                                                    }}
                                                    onClick={() => setSelectedObra(group.obraId)}
                                                    className="text-left rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] p-5 md:p-6 transition-transform active:scale-[0.97] group relative overflow-hidden"
                                                >
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-[12px] mb-4" style={{ backgroundColor: accent.bg }}>
                                                        <Building2 className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
                                                    </span>
                                                    <p className="text-[15px] font-semibold truncate pr-6">{group.obraNome}</p>
                                                    <p className="text-[24px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mt-3">
                                                        {formatCurrency(group.totalCost)}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                                                        <div>
                                                            <p className="text-[15px] font-semibold tabular-nums leading-none">{group.totalItems}</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">itens</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[15px] font-semibold tabular-nums leading-none">{formatNumber(group.totalQty)}</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">unidades</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[15px] font-semibold tabular-nums leading-none">{group.almoxarifados}</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">almox.</p>
                                                        </div>
                                                        {group.lowStockCount > 0 && (
                                                            <div className="ml-auto">
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[11px] font-medium">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    {group.lowStockCount}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            )
                                        })}
                                    </motion.div>
                                </>
                            )}

                            {obraGroups.length === 0 && (
                                <div className="text-center py-20">
                                    <PackagePlus className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                                    <p className="text-[17px] font-medium text-muted-foreground">Nenhum item em estoque</p>
                                    <p className="text-[15px] text-muted-foreground/70 mt-1 mb-6">Adicione materiais ao estoque para começar</p>
                                    <Button onClick={() => setEntradaOpen(true)} size="sm">
                                        <Plus className="h-4 w-4 mr-1.5" />Nova Entrada
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* ━━━━ TABLE VIEW with Actions ━━━━ */
                        <motion.div
                            key="table"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedObra(null)}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl text-primary hover:bg-primary/8 transition-colors"
                                    >
                                        <ArrowLeft className="h-[18px] w-[18px]" />
                                    </button>
                                    <div>
                                        <h2 className="text-[17px] font-semibold">
                                            {selectedObra === '__all__' ? 'Estoque Geral' : selectedGroup?.obraNome ?? '—'}
                                        </h2>
                                        <p className="text-[12px] text-muted-foreground">
                                            {selectedObra === '__all__'
                                                ? `${formatNumber(totals.items)} itens · ${formatCurrency(totals.cost)}`
                                                : `${selectedGroup?.totalItems ?? 0} itens · ${formatCurrency(selectedGroup?.totalCost ?? 0)}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Instruction banner */}
                            <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground">
                                <span className="flex-shrink-0">📦</span>
                                <span>Use <strong>Baixa</strong> para registrar uso de materiais. Use <strong>↔</strong> para transferir entre almoxarifados.</span>
                            </div>

                            {(() => {
                                const lowCount = selectedObra === '__all__' ? totals.lowStock : (selectedGroup?.lowStockCount ?? 0)
                                if (lowCount === 0) return null
                                return (
                                    <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3">
                                        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                                        <p className="text-[13px]">
                                            <span className="font-medium text-warning">{lowCount} {lowCount === 1 ? 'item' : 'itens'}</span>
                                            <span className="text-muted-foreground"> abaixo do estoque mínimo</span>
                                        </p>
                                    </div>
                                )
                            })()}

                            <DataTable
                                columns={makeColumns(selectedObra === '__all__')}
                                data={selectedObra === '__all__' ? allItems : (selectedGroup?.items ?? [])}
                                isLoading={false}
                                searchPlaceholder={selectedObra === '__all__' ? 'Buscar em todo estoque...' : `Buscar em ${selectedGroup?.obraNome ?? 'estoque'}...`}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══════ DAR BAIXA DIALOG ═══════ */}
            <Dialog open={!!baixaTarget} onOpenChange={(v) => { if (!v) { setBaixaTarget(null); setBaixaQty(''); setBaixaObs('') } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Dar Baixa</DialogTitle>
                        <DialogDescription>Registre o uso/consumo de material.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* Material + Almoxarifado info */}
                        <div className="flex items-center gap-3.5 rounded-xl bg-accent/50 px-4 py-3.5">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-orange-500/10">
                                <Minus className="h-5 w-5 text-orange-500" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] sm:text-[13px] font-semibold truncate">{baixaTarget?.materialNome}</p>
                                <p className="text-[12px] text-muted-foreground">
                                    {baixaTarget?.almoxarifadoNome} · {baixaTarget?.obraNome}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[18px] font-bold tabular-nums text-foreground">{formatNumber(baixaTarget?.quantidadeDisponivel ?? 0)}</p>
                                <p className="text-[11px] text-muted-foreground">{baixaTarget?.unidade} disponível</p>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                            <Label>Quantidade a retirar</Label>
                            <Input
                                type="number"
                                value={baixaQty}
                                onChange={(e) => setBaixaQty(e.target.value)}
                                placeholder="0"
                                autoFocus
                                max={baixaTarget?.quantidadeDisponivel}
                                min={0.01}
                                step="any"
                                className={cn(
                                    Number(baixaQty) > (baixaTarget?.quantidadeDisponivel ?? 0) && 'border-destructive focus-visible:ring-destructive'
                                )}
                            />
                            {Number(baixaQty) > (baixaTarget?.quantidadeDisponivel ?? 0) && (
                                <p className="text-[12px] text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Quantidade excede o disponível ({formatNumber(baixaTarget?.quantidadeDisponivel ?? 0)} {baixaTarget?.unidade})
                                </p>
                            )}
                            {Number(baixaQty) > 0 && Number(baixaQty) <= (baixaTarget?.quantidadeDisponivel ?? 0) && (
                                <p className="text-[12px] text-muted-foreground">
                                    Restará: <span className="font-semibold tabular-nums">{formatNumber((baixaTarget?.quantidadeDisponivel ?? 0) - Number(baixaQty))}</span> {baixaTarget?.unidade}
                                </p>
                            )}
                        </div>

                        {/* Observation */}
                        <div className="space-y-2">
                            <Label>Motivo / Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input
                                value={baixaObs}
                                onChange={(e) => setBaixaObs(e.target.value)}
                                placeholder="Ex: Fundação Bloco C, Instalação elétrica..."
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setBaixaTarget(null); setBaixaQty(''); setBaixaObs('') }}>Cancelar</Button>
                            <Button
                                onClick={handleDarBaixa}
                                disabled={!baixaQty || Number(baixaQty) <= 0 || Number(baixaQty) > (baixaTarget?.quantidadeDisponivel ?? 0)}
                                loading={createSaida.isPending}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                <Minus className="h-4 w-4 mr-1.5" />
                                Confirmar Baixa
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════ TRANSFER DIALOG ═══════ */}
            <Dialog open={!!transfTarget} onOpenChange={(v) => { if (!v) { setTransfTarget(null); setTransfQty(''); setTransfDestinoId('') } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Transferir Material</DialogTitle>
                        <DialogDescription>Transfira material entre almoxarifados. Ficará pendente até aprovação.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="flex items-center gap-3.5 rounded-xl bg-accent/50 px-4 py-3.5">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-primary/10">
                                <ArrowRightLeft className="h-5 w-5 text-primary" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] sm:text-[13px] font-semibold truncate">{transfTarget?.materialNome}</p>
                                <p className="text-[12px] text-muted-foreground">De: {transfTarget?.almoxarifadoNome}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Almoxarifado Destino</Label>
                            <Select value={transfDestinoId} onValueChange={setTransfDestinoId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                                <SelectContent>
                                    {almoxList
                                        .filter((a: any) => a.id !== transfTarget?.almoxarifadoId)
                                        .map((a: any) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.nome}{a.obra?.nome ? ` — ${a.obra.nome}` : ''}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                value={transfQty}
                                onChange={(e) => setTransfQty(e.target.value)}
                                placeholder="0"
                                min={0.01}
                                step="any"
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setTransfTarget(null); setTransfQty(''); setTransfDestinoId('') }}>Cancelar</Button>
                            <Button
                                onClick={handleTransfer}
                                disabled={!transfDestinoId || !transfQty || Number(transfQty) <= 0}
                                loading={createTransferencia.isPending}
                            >
                                Solicitar Transferência
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════ NOVA ENTRADA MODAL ═══════ */}
            <Dialog open={entradaOpen} onOpenChange={(v) => { setEntradaOpen(v); if (!v) resetEntrada() }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Entrada de Estoque</DialogTitle>
                        <DialogDescription>Registre a entrada de material em um almoxarifado.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                        {/* 1. Material */}
                        <div className="space-y-2">
                            <Label>Material</Label>
                            <Select value={entMaterialId} onValueChange={setEntMaterialId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o material" />
                                </SelectTrigger>
                                <SelectContent>
                                    {materiaisList.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.nome} <span className="text-muted-foreground ml-1">({m.codigo})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Material info chip */}
                        {selectedMaterial && (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent/50 px-4 py-3">
                                <Badge variant="secondary">{selectedMaterial.categoria?.nome}</Badge>
                                <span className="text-[13px] sm:text-[12px] text-muted-foreground">
                                    Unidade: <strong>{selectedMaterial.categoria?.unidade}</strong>
                                </span>
                                {selectedMaterial.preco_unitario > 0 && (
                                    <span className="text-[13px] sm:text-[12px] text-muted-foreground sm:ml-auto">
                                        Último: <strong>{formatCurrency(selectedMaterial.preco_unitario)}</strong>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* 2. Unidade */}
                        <div className="space-y-2">
                            <Label>Unidade</Label>
                            <Select value={entUnidade} onValueChange={setEntUnidade}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        { value: 'UN', label: 'Unidade (un)' },
                                        { value: 'KG', label: 'Quilograma (kg)' },
                                        { value: 'SC', label: 'Saco (sc)' },
                                        { value: 'M', label: 'Metro (m)' },
                                        { value: 'M2', label: 'Metro² (m²)' },
                                        { value: 'M3', label: 'Metro³ (m³)' },
                                        { value: 'L', label: 'Litro (L)' },
                                        { value: 'CX', label: 'Caixa (cx)' },
                                        { value: 'PC', label: 'Peça (pç)' },
                                        { value: 'TB', label: 'Tubo (tb)' },
                                        { value: 'GL', label: 'Galão (gl)' },
                                        { value: 'FD', label: 'Fardo (fd)' },
                                        { value: 'RL', label: 'Rolo (rl)' },
                                        { value: 'PR', label: 'Par (pr)' },
                                        { value: 'TN', label: 'Tonelada (t)' },
                                    ].map((u) => (
                                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Quantidade + Preço */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={entQty}
                                    onChange={(e) => setEntQty(e.target.value)}
                                    placeholder="0"
                                    className="tabular-nums"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Preço Un. (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={entPreco}
                                    onChange={(e) => setEntPreco(e.target.value)}
                                    placeholder={(selectedMaterial?.preco_unitario ?? 0) > 0 ? String(selectedMaterial!.preco_unitario) : '0,00'}
                                    className="tabular-nums"
                                />
                            </div>
                        </div>

                        {/* Subtotal preview */}
                        {entQty && Number(entQty) > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-accent/50 px-4 py-3">
                                <span className="text-[14px] sm:text-[13px] text-muted-foreground">Subtotal</span>
                                <span className="text-[18px] sm:text-[17px] font-bold tabular-nums">
                                    {formatCurrency(Number(entQty) * (Number(entPreco) || selectedMaterial?.preco_unitario || 0))}
                                </span>
                            </div>
                        )}

                        {/* 4. Almoxarifado */}
                        <div className="space-y-2">
                            <Label>Almoxarifado (destino)</Label>
                            <Select value={entAlmoxId} onValueChange={setEntAlmoxId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o almoxarifado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {almoxByObra.map(([obraId, { obraNome, almoxs }]) => (
                                        <div key={obraId}>
                                            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{obraNome}</div>
                                            {almoxs.map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 5. Forma de Pagamento */}
                        <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={entPagamento} onValueChange={setEntPagamento}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PIX">PIX</SelectItem>
                                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                                    <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                                    <SelectItem value="TRANSFERENCIA">Transferência Bancária</SelectItem>
                                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 6. Fornecedor (optional) */}
                        <div className="space-y-2">
                            <Label>Fornecedor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Select value={entFornecedorId} onValueChange={setEntFornecedorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o fornecedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fornecedoresList.map((f: any) => (
                                        <SelectItem key={f.id} value={f.id}>
                                            {f.nome}{f.cnpj ? ` — ${f.cnpj}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 7. Observação */}
                        <div className="space-y-2">
                            <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            <Input
                                value={entObs}
                                onChange={(e) => setEntObs(e.target.value)}
                                placeholder="Ex: Compra NF 12345"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setEntradaOpen(false); resetEntrada() }}>Cancelar</Button>
                            <Button
                                onClick={() => createEntrada.mutate({
                                    p_material_id: entMaterialId,
                                    p_quantidade: Number(entQty),
                                    p_preco_unitario: Number(entPreco) || selectedMaterial?.preco_unitario || 0,
                                    p_almoxarifado_id: entAlmoxId,
                                    p_fornecedor_id: entFornecedorId || undefined,
                                    p_unidade: entUnidade || undefined,
                                    p_forma_pagamento: entPagamento || undefined,
                                    p_observacao: entObs || undefined,
                                }, {
                                    onSuccess: () => {
                                        toast({ title: 'Entrada registrada', description: 'O estoque foi atualizado com sucesso.', variant: 'success' })
                                        setEntradaOpen(false)
                                        resetEntrada()
                                    },
                                    onError: () => {
                                        toast({ title: 'Erro ao registrar entrada', variant: 'error' })
                                    }
                                })}
                                disabled={!canSubmitEntrada}
                                loading={createEntrada.isPending}
                            >
                                Registrar Entrada
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════ ZERAR ESTOQUE DIALOG (cria SAIDA total) ═══════ */}
            <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Zerar Estoque</DialogTitle>
                        <DialogDescription>
                            Será registrada uma saída de <strong>{formatNumber(deleteTarget?.quantidade ?? 0)} {deleteTarget?.unidade}</strong> de <strong>{deleteTarget?.materialNome}</strong> do almoxarifado <strong>{deleteTarget?.almoxarifadoNome}</strong>. Esta ação será registrada nas movimentações.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteTarget && deleteTarget.quantidade > 0 && createSaida.mutate({
                                p_material_id: deleteTarget.materialId,
                                p_quantidade: deleteTarget.quantidade,
                                p_preco_unitario: deleteTarget.precoUnitario,
                                p_almoxarifado_id: deleteTarget.almoxarifadoId,
                                p_observacao: 'Estoque zerado manualmente',
                            }, {
                                onSuccess: () => {
                                    toast({ title: 'Estoque zerado', description: 'Saída registrada nas movimentações.', variant: 'success' })
                                    setDeleteTarget(null)
                                },
                                onError: () => toast({ title: 'Erro ao zerar estoque', variant: 'error' }),
                            })}
                            loading={createSaida.isPending}
                        >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Zerar Estoque
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
