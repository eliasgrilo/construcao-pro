import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, MapPin, Warehouse, Package, ArrowLeftRight,
    ArrowDownRight, ArrowUpRight, Plus, Trash2, AlertTriangle,
    User, DollarSign, Minus, ArrowRightLeft, Check, ChevronDown,
    Landmark, FileText, Building2, Banknote, TrendingUp, TrendingDown, Sparkles,
} from 'lucide-react'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    AreaChart, Area, XAxis, YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
    useObra, useObraAlmoxarifados, useObraEstoque, useObraMovimentacoes,
    useMateriais, useObraCustos, useAlmoxarifados, useFornecedores,
    useCreateAlmoxarifado, useDeleteAlmoxarifado, useUpdateObra,
    useCreateMovimentacaoEntrada, useCreateMovimentacaoSaida, useCreateMovimentacaoTransferencia,
} from '@/hooks/use-supabase'
import { cn, formatNumber, formatDate, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface ChartTooltipProps {
    active?: boolean
    payload?: { value: number; name?: string; dataKey?: string; color?: string }[]
    label?: string
}

/* ── Constants ── */
const statusMap: Record<string, { label: string; variant: 'success' | 'secondary' | 'warning' | 'info'; color: string }> = {
    ATIVA: { label: 'Ativa', variant: 'success', color: '#34C759' },
    FINALIZADA: { label: 'Finalizada', variant: 'secondary', color: '#8E8E93' },
    PAUSADA: { label: 'Pausada', variant: 'warning', color: '#FF9500' },
    VENDIDO: { label: 'Vendido', variant: 'info', color: '#5856D6' },
    TERRENO: { label: 'Terreno', variant: 'info', color: '#AF52DE' },
}
const tipoConfig: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
    ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: '#34C759' },
    SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: '#FF3B30' },
    TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: '#007AFF' },
}
const statusTransf: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
    PENDENTE: { label: 'Pendente', variant: 'warning' },
    APROVADA_NIVEL_1: { label: 'Aprovada N1', variant: 'secondary' },
    APROVADA: { label: 'Aprovada', variant: 'success' },
    REJEITADA: { label: 'Rejeitada', variant: 'destructive' },
}
const RING_COLORS = ['#007AFF', '#AF52DE', '#5AC8FA', '#FF9500', '#34C759', '#FF2D55']

type Tab = 'custos' | 'almoxarifados' | 'estoque' | 'movimentacoes'
const tabs: { key: Tab; label: string; icon: typeof Warehouse }[] = [
    { key: 'custos', label: 'Custos', icon: DollarSign },
    { key: 'almoxarifados', label: 'Almoxarifados', icon: Warehouse },
    { key: 'estoque', label: 'Estoque', icon: Package },
    { key: 'movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
]

/* ── Status Switcher ── */
function StatusSwitcher({
    currentStatus,
    isUpdating,
    onStatusChange,
}: {
    currentStatus: string
    isUpdating: boolean
    onStatusChange: (status: string) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const current = statusMap[currentStatus]

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => !isUpdating && setOpen((o) => !o)}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border transition-all select-none',
                    isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                    current?.variant === 'success' && 'bg-success/12 text-success border-success/20 hover:bg-success/20',
                    current?.variant === 'warning' && 'bg-warning/12 text-warning border-warning/20 hover:bg-warning/20',
                    current?.variant === 'secondary' && 'bg-secondary text-secondary-foreground border-border hover:bg-accent',
                )}
            >
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: current?.color }} />
                {current?.label}
                <motion.span
                    className="flex items-center"
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <ChevronDown className="h-2.5 w-2.5" />
                </motion.span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute left-0 top-full mt-2 z-50 min-w-[148px] rounded-xl bg-popover border shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden py-1"
                    >
                        {Object.entries(statusMap).map(([key, cfg], i) => (
                            <motion.button
                                key={key}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.15 }}
                                onClick={() => {
                                    if (key !== currentStatus) onStatusChange(key)
                                    setOpen(false)
                                }}
                                className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left',
                                    key === currentStatus
                                        ? 'text-foreground font-medium bg-accent/50'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                                )}
                            >
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                                {cfg.label}
                                {key === currentStatus && (
                                    <Check className="h-3.5 w-3.5 ml-auto text-primary" />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ── Apple tooltip ── */
function ChartTip({ active, payload }: ChartTooltipProps) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl bg-popover/95 backdrop-blur-md border px-3 py-2 shadow-lg text-[12px]">
            <p className="font-medium tabular-nums">{formatCurrency(payload[0]?.value ?? 0)}</p>
        </div>
    )
}

export function ObraDetailPage() {
    const { obraId } = useParams({ strict: false }) as { obraId: string }
    const navigate = useNavigate()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<Tab>('custos')

    /* Dialogs */
    const [createAlmoxOpen, setCreateAlmoxOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
    const [movDialog, setMovDialog] = useState(false)
    const [newAlmoxName, setNewAlmoxName] = useState('')
    const [movTipo, setMovTipo] = useState('ENTRADA')
    const [movMaterialId, setMovMaterialId] = useState('')
    const [movAlmoxId, setMovAlmoxId] = useState('')
    const [movAlmoxDestinoId, setMovAlmoxDestinoId] = useState('')
    const [movQty, setMovQty] = useState('')
    const [editingBudget, setEditingBudget] = useState(false)
    const [budgetInput, setBudgetInput] = useState('')
    const budgetRef = useRef<HTMLInputElement>(null)

    const [editingTerreno, setEditingTerreno] = useState(false)
    const [terrenoInput, setTerrenoInput] = useState('')
    const terrenoRef = useRef<HTMLInputElement>(null)

    /* ── Venda Dialog ── */
    const [vendaDialog, setVendaDialog] = useState(false)
    const [vendaInput, setVendaInput] = useState('')
    const vendaInputRef = useRef<HTMLInputElement>(null)

    /* ── Rich Entrada Dialog ── */
    const [entradaDialog, setEntradaDialog] = useState(false)
    const [entMaterialId, setEntMaterialId] = useState('')
    const [entQty, setEntQty] = useState('')
    const [entPreco, setEntPreco] = useState('')
    const [entUnidade, setEntUnidade] = useState('')
    const [entPagamento, setEntPagamento] = useState('')
    const [entAlmoxId, setEntAlmoxId] = useState('')
    const [entFornecedorId, setEntFornecedorId] = useState('')
    const [entObs, setEntObs] = useState('')

    /* ── Dar Baixa (Saída rápida) ── */
    const [baixaTarget, setBaixaTarget] = useState<{
        materialId: string
        materialNome: string
        materialCodigo: string
        almoxarifadoId: string
        almoxarifadoNome: string
        quantidadeDisponivel: number
        unidade: string
        precoUnitario: number
    } | null>(null)
    const [baixaQty, setBaixaQty] = useState('')
    const [baixaObs, setBaixaObs] = useState('')

    /* ── Zerar estoque (registra saída total) ── */
    const [deleteEstoqueTarget, setDeleteEstoqueTarget] = useState<{
        id: string
        materialId: string
        materialNome: string
        almoxarifadoId: string
        almoxarifadoNome: string
        quantidade: number
        unidade: string
        precoUnitario: number
    } | null>(null)

    /* Queries */
    const { data: obra, isLoading: obraLoading } = useObra(obraId)
    const { data: almoxarifados = [] } = useObraAlmoxarifados(obraId)
    const { data: estoque = [] } = useObraEstoque(obraId)
    const { data: movimentacoes = [] } = useObraMovimentacoes(obraId)
    const { data: materiais = [] } = useMateriais()
    const { data: custos } = useObraCustos(obraId)
    const { data: allAlmoxarifados = [] } = useAlmoxarifados()
    const { data: fornecedoresData = [] } = useFornecedores()

    /* Mutations */
    const createAlmox = useCreateAlmoxarifado()
    const deleteAlmox = useDeleteAlmoxarifado()
    const updateOrcamento = useUpdateObra()
    const createEntrada = useCreateMovimentacaoEntrada()
    const createSaida = useCreateMovimentacaoSaida()
    const createTransferencia = useCreateMovimentacaoTransferencia()

    const status = obra ? statusMap[obra.status] : null

    const resetMovForm = () => {
        setMovDialog(false)
        setMovTipo('ENTRADA')
        setMovMaterialId('')
        setMovAlmoxId('')
        setMovAlmoxDestinoId('')
        setMovQty('')
    }

    const resetEntrada = () => {
        setEntradaDialog(false)
        setEntMaterialId(''); setEntQty(''); setEntPreco('')
        setEntUnidade(''); setEntPagamento('')
        setEntAlmoxId(''); setEntFornecedorId(''); setEntObs('')
    }
    const selectedEntMaterial = (materiais as any[]).find((m: any) => m.id === entMaterialId)
    const canSubmitEntrada = !!(entMaterialId && entAlmoxId && entQty && Number(entQty) > 0 && entUnidade && entPagamento)

    const handleCreateMov = () => {
        const onSuccess = () => {
            resetMovForm()
            const labels: Record<string, string> = { ENTRADA: 'Entrada registrada', SAIDA: 'Saída registrada', TRANSFERENCIA: 'Transferência solicitada' }
            toast({ title: labels[movTipo] || 'Movimentação registrada', variant: 'success' })
        }
        const onError = () => toast({ title: 'Erro ao registrar movimentação', variant: 'error' })
        const selectedMat = materiais.find((m: any) => m.id === movMaterialId)
        const materialPrice = selectedMat?.preco_unitario ?? 0
        if (movTipo === 'ENTRADA') {
            createEntrada.mutate({
                p_material_id: movMaterialId,
                p_quantidade: Number(movQty),
                p_preco_unitario: materialPrice,
                p_almoxarifado_id: movAlmoxId,
            }, { onSuccess, onError })
        } else if (movTipo === 'SAIDA') {
            createSaida.mutate({
                p_material_id: movMaterialId,
                p_quantidade: Number(movQty),
                p_preco_unitario: materialPrice,
                p_almoxarifado_id: movAlmoxId,
            }, { onSuccess, onError })
        } else {
            createTransferencia.mutate({
                p_material_id: movMaterialId,
                p_quantidade: Number(movQty),
                p_almoxarifado_id: movAlmoxId,
                p_almoxarifado_destino_id: movAlmoxDestinoId,
            }, { onSuccess, onError })
        }
    }

    /* ── Dar Baixa handler (saída rápida pelo estoque) ── */
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
                    description: `${baixaQty} ${baixaTarget.unidade} de ${baixaTarget.materialNome} retirados do ${baixaTarget.almoxarifadoNome}`,
                    variant: 'success',
                })
                setBaixaTarget(null)
                setBaixaQty('')
                setBaixaObs('')
            },
            onError: () => toast({ title: 'Erro ao registrar baixa', description: 'Verifique a quantidade disponível.', variant: 'error' }),
        })
    }

    const movPending = createEntrada.isPending || createSaida.isPending || createTransferencia.isPending

    if (obraLoading) {
        return (
            <div className="p-8 space-y-4">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-8 w-56 bg-muted rounded-lg animate-pulse" />
                <div className="h-4 w-72 bg-muted rounded animate-pulse" />
            </div>
        )
    }

    return (
        <div className="pb-10">
            {/* ─── Header ─── */}
            <div className="px-4 md:px-8 pt-6 pb-0">
                <button onClick={() => navigate({ to: '/obras' })} className="flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 transition-colors mb-5">
                    <ArrowLeft className="h-3.5 w-3.5" />Obras
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight">{obra?.nome ?? '—'}</h1>
                            {obra && (
                                <StatusSwitcher
                                    currentStatus={obra.status}
                                    isUpdating={updateOrcamento.isPending}
                                    onStatusChange={(newStatus) => {
                                        if (newStatus === 'VENDIDO') {
                                            setVendaInput('')
                                            setVendaDialog(true)
                                            setTimeout(() => vendaInputRef.current?.focus(), 150)
                                        } else {
                                            updateOrcamento.mutate(
                                                { id: obraId, status: newStatus },
                                                {
                                                    onSuccess: () => toast({ title: `Status alterado para ${statusMap[newStatus]?.label}` }),
                                                    onError: () => toast({ title: 'Erro ao alterar status', variant: 'error' }),
                                                },
                                            )
                                        }
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />{obra?.endereco}
                        </div>
                    </div>
                </div>

                {/* Summary metrics */}
                <div className="grid grid-cols-2 gap-4 md:flex md:gap-10 mt-7 pb-6 border-b">
                    {/* Orçamento — editable */}
                    <div>
                        {editingBudget ? (
                            <input
                                ref={budgetRef}
                                type="number"
                                className="text-[20px] md:text-[26px] font-semibold tabular-nums leading-none bg-transparent border-b-2 border-primary outline-none w-32 md:w-40"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                onBlur={() => {
                                    const val = Number(budgetInput)
                                    if (val >= 0) updateOrcamento.mutate({ id: obraId, orcamento: val }, { onSuccess: () => setEditingBudget(false) })
                                    else setEditingBudget(false)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = Number(budgetInput)
                                        if (val >= 0) updateOrcamento.mutate({ id: obraId, orcamento: val }, { onSuccess: () => setEditingBudget(false) })
                                    }
                                    if (e.key === 'Escape') setEditingBudget(false)
                                }}
                                autoFocus
                            />
                        ) : (
                            <p
                                className="text-[20px] md:text-[26px] font-semibold tabular-nums leading-none cursor-pointer hover:text-primary transition-colors"
                                onClick={() => {
                                    setBudgetInput(String(custos?.orcamento ?? obra?.orcamento ?? 0))
                                    setEditingBudget(true)
                                    setTimeout(() => budgetRef.current?.focus(), 50)
                                }}
                                title="Clique para editar"
                            >
                                {formatCurrency(custos?.orcamento ?? 0)}
                            </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">Orçamento <span className="text-primary/60 hidden sm:inline">· clique para editar</span></p>
                    </div>
                    {/* Other metrics */}
                    {[
                        { label: 'Total', value: formatCurrency(custos?.total ?? 0) },
                        { label: 'Utilizado', value: `${custos?.percentual ?? 0}%` },
                        { label: 'Saldo', value: formatCurrency(custos?.saldo ?? 0) },
                    ].map((m) => (
                        <div key={m.label}>
                            <p className="text-[20px] md:text-[26px] font-semibold tabular-nums leading-none">{m.value}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{m.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="px-4 md:px-8 border-b">
                <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
                            'flex items-center gap-1.5 px-3 md:px-4 py-3 text-[13px] font-medium border-b-[2px] transition-colors whitespace-nowrap flex-shrink-0',
                            activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}>
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Content ─── */}
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="px-4 md:px-8 pt-6">

                {/* ════════ CUSTOS ════════ */}
                {activeTab === 'custos' && custos && (
                    <div className="space-y-8">
                        {/* Row 1: Budget gauge + Category ring */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Budget card with editable categories */}
                            <div className="rounded-xl border bg-card p-5">
                                <h3 className="text-[15px] font-semibold mb-4">Orçamento</h3>
                                <div className="flex items-center gap-6">
                                    {/* Ring */}
                                    <div className="relative flex-shrink-0">
                                        <svg viewBox="0 0 120 120" className="h-28 w-28">
                                            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-muted)" strokeWidth="8" />
                                            <circle
                                                cx="60" cy="60" r="52" fill="none"
                                                stroke={custos.percentual > 90 ? '#FF3B30' : custos.percentual > 70 ? '#FF9500' : '#34C759'}
                                                strokeWidth="8" strokeLinecap="round"
                                                strokeDasharray={`${Math.min(custos.percentual / 100, 1) * 327} 327`}
                                                transform="rotate(-90 60 60)"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[22px] font-bold tabular-nums">{custos.percentual}%</span>
                                        </div>
                                    </div>
                                    {/* Values */}
                                    <div className="space-y-2.5 flex-1 min-w-0">
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="text-muted-foreground">Orçamento</span>
                                            <span className="font-semibold tabular-nums">{formatCurrency(custos.orcamento)}</span>
                                        </div>
                                        {/* Terreno — click to edit */}
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <Landmark className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#AF52DE' }} />
                                                Terreno
                                            </span>
                                            {editingTerreno ? (
                                                <input
                                                    ref={terrenoRef}
                                                    type="number" step="0.01" min="0"
                                                    className="text-[13px] font-semibold tabular-nums bg-transparent border-b border-primary outline-none w-28 text-right"
                                                    value={terrenoInput}
                                                    onChange={(e) => setTerrenoInput(e.target.value)}
                                                    onBlur={() => {
                                                        const val = Number(terrenoInput)
                                                        if (val >= 0) updateOrcamento.mutate({ id: obraId, valor_terreno: val }, { onSuccess: () => setEditingTerreno(false) })
                                                        else setEditingTerreno(false)
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') { const val = Number(terrenoInput); if (val >= 0) updateOrcamento.mutate({ id: obraId, valor_terreno: val }, { onSuccess: () => setEditingTerreno(false) }) }
                                                        if (e.key === 'Escape') setEditingTerreno(false)
                                                    }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="font-semibold tabular-nums cursor-pointer hover:text-primary transition-colors"
                                                    style={{ color: (custos.valorTerreno ?? 0) > 0 ? '#AF52DE' : undefined }}
                                                    onClick={() => { setTerrenoInput(String(custos.valorTerreno ?? 0)); setEditingTerreno(true); setTimeout(() => terrenoRef.current?.focus(), 50) }}
                                                    title="Clique para editar"
                                                >
                                                    {formatCurrency(custos.valorTerreno ?? 0)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Burocracia — read only */}
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#007AFF' }} />
                                                Burocracia
                                            </span>
                                            <span className="font-semibold tabular-nums" style={{ color: (custos.valorBurocracia ?? 0) > 0 ? '#007AFF' : undefined }}>
                                                {formatCurrency(custos.valorBurocracia ?? 0)}
                                            </span>
                                        </div>

                                        {/* Construção — read only */}
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FF9500' }} />
                                                Construção
                                            </span>
                                            <span className="font-semibold tabular-nums" style={{ color: (custos.valorConstrucao ?? 0) > 0 ? '#FF9500' : undefined }}>
                                                {formatCurrency(custos.valorConstrucao ?? 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="font-medium">Total</span>
                                            <span className="font-bold tabular-nums">{formatCurrency(custos.total ?? 0)}</span>
                                        </div>

                                        {/* Venda / Lucro — only for VENDIDO */}
                                        {obra?.status === 'VENDIDO' && (custos.valorVenda ?? 0) > 0 ? (() => {
                                            const valorVenda = custos.valorVenda ?? 0
                                            const lucro = valorVenda - (custos.total ?? 0)
                                            const isPositive = lucro >= 0
                                            const margem = (custos.total ?? 0) > 0 ? ((lucro / (custos.total ?? 0)) * 100).toFixed(1) : '0.0'
                                            return (
                                                <div className="border-t border-border/30 pt-2.5 space-y-2">
                                                    <div className="flex justify-between items-center text-[13px]">
                                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Banknote className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#5856D6' }} />
                                                            Venda
                                                        </span>
                                                        <span className="font-semibold tabular-nums" style={{ color: '#5856D6' }}>{formatCurrency(valorVenda)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[13px]">
                                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                                            {isPositive
                                                                ? <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                                                                : <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                                                            }
                                                            {isPositive ? 'Lucro' : 'Prejuízo'}
                                                        </span>
                                                        <span className={cn('font-semibold tabular-nums', isPositive ? 'text-success' : 'text-destructive')}>
                                                            {isPositive ? '+' : ''}{formatCurrency(lucro)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground text-right">
                                                        Margem: <span className={cn('font-semibold', isPositive ? 'text-success' : 'text-destructive')}>{isPositive ? '+' : ''}{margem}%</span>
                                                    </p>
                                                </div>
                                            )
                                        })() : (
                                            <div className="border-t border-border/30 pt-2.5">
                                                <div className="flex justify-between text-[13px]">
                                                    <span className="text-muted-foreground">Saldo</span>
                                                    <span className={cn('font-semibold tabular-nums', (custos.saldo ?? 0) < 0 ? 'text-destructive' : 'text-success')}>
                                                        {formatCurrency(custos.saldo ?? 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Category ring chart */}
                            <div className="rounded-xl border bg-card p-5">
                                <h3 className="text-[15px] font-semibold mb-2">Por Categoria</h3>
                                {(custos.porCategoria || []).length === 0 ? (
                                    <p className="text-[13px] text-muted-foreground py-8 text-center">Nenhum valor inserido ainda.</p>
                                ) : (
                                    <div className="flex items-center">
                                        <ResponsiveContainer width={160} height={160}>
                                            <PieChart>
                                                <Pie data={custos.porCategoria || []} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={68} innerRadius={44} paddingAngle={3} strokeWidth={0} cornerRadius={3}>
                                                    {(custos.porCategoria || []).map((_cat: any, i: number) => (
                                                        <Cell key={i} fill={RING_COLORS[i % RING_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ChartTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex-1 space-y-2.5 ml-2">
                                            {(custos.porCategoria || []).map((cat: any, i: number) => {
                                                const color = RING_COLORS[i % RING_COLORS.length]
                                                const totalPie = (custos.porCategoria || []).reduce((sum: number, c: any) => sum + (c.valor ?? 0), 0)
                                                const pct = totalPie > 0 ? Math.round((cat.valor / totalPie) * 100) : 0
                                                return (
                                                    <div key={cat.categoria} className="flex items-center text-[12px] gap-2">
                                                        <span className="h-[8px] w-[8px] rounded-full flex-shrink-0" style={{ background: color }} />
                                                        <span className="text-muted-foreground truncate flex-1">{cat.categoria}</span>
                                                        <span className="tabular-nums font-medium">{pct}%</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Spending trend */}
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="text-[15px] font-semibold">Evolução Mensal</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">gastos nos últimos 6 meses</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={custos.tendencia} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#007AFF" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" width={50} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<ChartTip />} />
                                    <Area type="monotone" dataKey="valor" stroke="#007AFF" strokeWidth={2} fill="url(#costGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Row 3: Purchase transactions (Apple Wallet style) */}
                        <div>
                            <h3 className="text-[15px] font-semibold mb-3">Compras Recentes</h3>
                            {(custos.entradas || []).length === 0 ? (
                                <Empty icon={DollarSign} text="Nenhuma compra registrada" sub="Entradas de material aparecerão aqui com seus custos." />
                            ) : (
                                <div className="rounded-xl border bg-card overflow-hidden">
                                    <ul className="divide-y divide-border/50">
                                        {(custos.entradas || []).map((tx: any) => (
                                            <li key={tx.id} className="flex items-center gap-3.5 px-5 py-3.5">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0" style={{ backgroundColor: '#34C75914' }}>
                                                    <ArrowDownRight className="h-[15px] w-[15px]" style={{ color: '#34C759' }} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium truncate">{tx.material}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {tx.quantidade} × {formatCurrency(tx.preco_unitario ?? tx.precoUnitario)} · {tx.almoxarifado}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[13px] font-semibold tabular-nums">{formatCurrency(tx.total)}</p>
                                                    <p className="text-[11px] text-muted-foreground tabular-nums">{formatDate(tx.data)}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Row 4: Material detail (simple list, not table) */}
                        <div>
                            <h3 className="text-[15px] font-semibold mb-3">Materiais em Estoque</h3>
                            {(custos.porMaterial || []).length === 0 ? (
                                <Empty icon={Package} text="Sem materiais" sub="Adicione materiais ao estoque." />
                            ) : (
                                <div className="rounded-xl border bg-card overflow-hidden">
                                    <ul className="divide-y divide-border/50">
                                        {(custos.porMaterial || []).map((item: any) => (
                                            <li key={item.id} className="flex items-center gap-3.5 px-5 py-3.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium truncate">{item.material}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {formatNumber(item.quantidade)} {item.unidade} × {formatCurrency(item.preco_unitario ?? item.precoUnitario)} · {item.almoxarifado}
                                                    </p>
                                                </div>
                                                <p className="text-[13px] font-semibold tabular-nums flex-shrink-0">{formatCurrency(item.subtotal)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex justify-between items-center px-5 py-3 border-t bg-muted/30">
                                        <span className="text-[13px] font-semibold">Total</span>
                                        <span className="text-[15px] font-bold tabular-nums">{formatCurrency(custos.realizado)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ════════ ALMOXARIFADOS ════════ */}
                {activeTab === 'almoxarifados' && (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[15px] font-semibold">Almoxarifados desta obra</h2>
                            <Button size="sm" onClick={() => setCreateAlmoxOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Novo</Button>
                        </div>
                        {almoxarifados.length === 0 ? (
                            <Empty icon={Warehouse} text="Nenhum almoxarifado" sub="Adicione um almoxarifado para gerenciar o estoque desta obra." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {almoxarifados.map((a: any) => {
                                    const aEstoque = estoque.filter((e: any) => e.almoxarifado?.id === a.id)
                                    const totalQty = aEstoque.reduce((s: number, e: any) => s + (e.quantidade || 0), 0)
                                    const lowStock = aEstoque.filter((e: any) => e.material?.estoque_minimo > 0 && (e.quantidade ?? 0) <= e.material.estoque_minimo)
                                    return (
                                        <div key={a.id} className="group rounded-xl border bg-card p-5">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0" style={{ backgroundColor: '#007AFF14' }}>
                                                        <Warehouse className="h-[17px] w-[17px]" style={{ color: '#007AFF' }} />
                                                    </span>
                                                    <div>
                                                        <p className="text-[14px] font-semibold">{a.nome}</p>
                                                        {a.responsavel && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <User className="h-3 w-3 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">{a.responsavel}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={() => setDeleteTarget({ id: a.id, nome: a.nome })}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            {aEstoque.length > 0 && (
                                                <ul className="mt-4 pt-3 border-t border-border/50 space-y-2">
                                                    {aEstoque.map((e: any) => {
                                                        const isLow = e.material?.estoque_minimo > 0 && (e.quantidade ?? 0) <= e.material.estoque_minimo
                                                        return (
                                                            <li key={e.id} className="flex items-center justify-between text-[12px]">
                                                                <span className="truncate text-muted-foreground">{e.material?.nome ?? '—'}</span>
                                                                <span className={cn('font-medium tabular-nums ml-2 flex items-center gap-1', isLow && 'text-destructive')}>
                                                                    {formatNumber(e.quantidade)}{isLow && <AlertTriangle className="h-3 w-3 text-warning" />}
                                                                </span>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            )}
                                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                                                <div><p className="text-[16px] font-semibold tabular-nums leading-none">{aEstoque.length}</p><p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Itens</p></div>
                                                <div><p className="text-[16px] font-semibold tabular-nums leading-none">{formatNumber(totalQty)}</p><p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Total</p></div>
                                                {lowStock.length > 0 && <div className="ml-auto flex items-center gap-1 text-[11px] text-warning font-medium"><AlertTriangle className="h-3 w-3" />{lowStock.length} baixo</div>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ════════ ESTOQUE (Redesigned — Apple Command Center) ════════ */}
                {activeTab === 'estoque' && (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[15px] font-semibold">Estoque desta obra</h2>
                            <Button size="sm" onClick={() => setEntradaDialog(true)}><Plus className="h-4 w-4 mr-1.5" />Entrada</Button>
                        </div>

                        {/* Instruction banner */}
                        {estoque.length > 0 && (
                            <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground mb-5">
                                <span className="flex-shrink-0">📦</span>
                                <span>Toque em <strong>Dar Baixa</strong> para registrar o uso de materiais na obra.</span>
                            </div>
                        )}

                        {estoque.length === 0 ? (
                            <Empty icon={Package} text="Nenhum material em estoque" sub="Registre uma entrada para adicionar materiais." />
                        ) : (
                            <div className="rounded-xl border bg-card overflow-hidden">
                                <ul className="divide-y divide-border/50">
                                    {estoque.map((e: any) => {
                                        const isLow = e.material?.estoque_minimo > 0 && (e.quantidade ?? 0) <= e.material.estoque_minimo
                                        const qty = e.quantidade ?? 0
                                        const min = e.material?.estoque_minimo ?? 0
                                        const unidade = e.material?.categoria?.unidade ?? 'UN'
                                        const pct = min > 0 ? Math.min((qty / min) * 100, 100) : 100

                                        return (
                                            <li key={e.id} className="px-4 sm:px-5 py-4 group">
                                                <div className="flex items-center gap-3.5">
                                                    {/* Quantity badge */}
                                                    <span className={cn(
                                                        'flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 text-[15px] font-bold tabular-nums',
                                                        isLow
                                                            ? 'bg-destructive/10 text-destructive'
                                                            : 'bg-accent text-foreground',
                                                    )}>
                                                        {formatNumber(qty)}
                                                    </span>

                                                    {/* Material info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] sm:text-[13px] font-semibold truncate">{e.material?.nome ?? '—'}</p>
                                                        <p className="text-[12px] sm:text-[11px] text-muted-foreground mt-0.5">
                                                            {e.almoxarifado?.nome ?? '—'}
                                                            <span className="mx-1.5">·</span>
                                                            <Badge variant="secondary" className="text-[10px] py-0 h-[16px] align-middle">{e.material?.categoria?.nome ?? '—'}</Badge>
                                                            <span className="mx-1.5">·</span>
                                                            {unidade}
                                                        </p>

                                                        {/* Stock level bar */}
                                                        {min > 0 && (
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <div className="flex-1 h-[4px] rounded-full bg-muted overflow-hidden max-w-[120px]">
                                                                    <div
                                                                        className={cn(
                                                                            'h-full rounded-full transition-all',
                                                                            isLow ? 'bg-destructive' : pct > 50 ? 'bg-green-500' : 'bg-amber-500',
                                                                        )}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <span className={cn(
                                                                    'text-[10px] tabular-nums font-medium',
                                                                    isLow ? 'text-destructive' : 'text-muted-foreground'
                                                                )}>
                                                                    {isLow && <AlertTriangle className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
                                                                    mín: {formatNumber(min)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action buttons */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-9 sm:h-8 px-3 text-[13px] sm:text-[12px] border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
                                                            onClick={() => setBaixaTarget({
                                                                materialId: e.material?.id,
                                                                materialNome: e.material?.nome ?? '—',
                                                                materialCodigo: e.material?.codigo ?? '',
                                                                almoxarifadoId: e.almoxarifado?.id,
                                                                almoxarifadoNome: e.almoxarifado?.nome ?? '—',
                                                                quantidadeDisponivel: qty,
                                                                unidade,
                                                                precoUnitario: e.material?.preco_unitario ?? 0,
                                                            })}
                                                        >
                                                            <Minus className="h-3.5 w-3.5 mr-1" />
                                                            Dar Baixa
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 sm:h-8 px-2 text-muted-foreground hover:text-primary hidden sm:flex"
                                                            title="Transferir"
                                                            onClick={() => {
                                                                setMovTipo('TRANSFERENCIA')
                                                                setMovMaterialId(e.material?.id)
                                                                setMovAlmoxId(e.almoxarifado?.id)
                                                                setMovDialog(true)
                                                            }}
                                                        >
                                                            <ArrowRightLeft className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 sm:h-8 px-2 text-muted-foreground hover:text-destructive"
                                                            title="Remover do estoque"
                                                            onClick={() => setDeleteEstoqueTarget({
                                                                id: e.id,
                                                                materialId: e.material?.id,
                                                                materialNome: e.material?.nome ?? '—',
                                                                almoxarifadoId: e.almoxarifado?.id,
                                                                almoxarifadoNome: e.almoxarifado?.nome ?? '—',
                                                                quantidade: qty,
                                                                unidade,
                                                                precoUnitario: e.material?.preco_unitario ?? 0,
                                                            })}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>

                                {/* Summary footer */}
                                <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/30">
                                    <span className="text-[13px] font-semibold">{estoque.length} {estoque.length === 1 ? 'material' : 'materiais'}</span>
                                    <span className="text-[12px] text-muted-foreground">
                                        {estoque.filter((e: any) => e.material?.estoque_minimo > 0 && (e.quantidade ?? 0) <= e.material.estoque_minimo).length > 0 && (
                                            <span className="text-destructive font-medium">
                                                <AlertTriangle className="h-3 w-3 inline mr-1 -mt-0.5" />
                                                {estoque.filter((e: any) => e.material?.estoque_minimo > 0 && (e.quantidade ?? 0) <= e.material.estoque_minimo).length} com estoque baixo
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════ MOVIMENTAÇÕES ════════ */}
                {activeTab === 'movimentacoes' && (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[15px] font-semibold">Movimentações desta obra</h2>
                            <Button size="sm" onClick={() => setMovDialog(true)}><Plus className="h-4 w-4 mr-1.5" />Nova Movimentação</Button>
                        </div>
                        {movimentacoes.length === 0 ? (
                            <Empty icon={ArrowLeftRight} text="Nenhuma movimentação" sub="Registre entradas e saídas de materiais." />
                        ) : (
                            <div className="rounded-xl border bg-card overflow-hidden">
                                <ul className="divide-y divide-border/50">
                                    {movimentacoes.map((mov: any) => {
                                        const t = tipoConfig[mov.tipo] ?? tipoConfig.ENTRADA
                                        const Icon = t.icon
                                        const st = mov.status_transferencia ? statusTransf[mov.status_transferencia] : null
                                        const precoUnit = mov.preco_unitario ?? 0
                                        const totalMov = mov.quantidade * precoUnit
                                        return (
                                            <li key={mov.id} className="flex items-center gap-3.5 px-5 py-3.5">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0" style={{ backgroundColor: `${t.tint}14` }}>
                                                    <Icon className="h-[15px] w-[15px]" style={{ color: t.tint }} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[13px] font-medium truncate">{mov.material?.nome ?? '—'}</p>
                                                        <span className="text-[12px] font-semibold tabular-nums" style={{ color: t.tint }}>{mov.tipo === 'SAIDA' ? '−' : mov.tipo === 'TRANSFERENCIA' ? '⇄' : '+'}{formatNumber(mov.quantidade)}</span>
                                                        {st && <Badge variant={st.variant} className="text-[10px] py-0 h-[18px]">{st.label}</Badge>}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {t.label} · {mov.almoxarifado?.nome ?? '—'}
                                                        {mov.tipo === 'TRANSFERENCIA' && mov.almoxarifado_destino ? ` → ${mov.almoxarifado_destino.nome}` : ''}
                                                        {mov.usuario?.nome ? ` · ${mov.usuario.nome}` : ''}
                                                        {precoUnit > 0 && ` · ${formatCurrency(precoUnit)}/un`}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    {totalMov > 0 ? (
                                                        <p className={cn(
                                                            'text-[13px] font-semibold tabular-nums',
                                                            mov.tipo === 'SAIDA' ? 'text-destructive' : 'text-success'
                                                        )}>
                                                            {mov.tipo === 'SAIDA' ? '−' : '+'}{formatCurrency(totalMov)}
                                                        </p>
                                                    ) : null}
                                                    <p className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(mov.created_at)}</p>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* ── Dialogs ── */}
            <Dialog open={createAlmoxOpen} onOpenChange={setCreateAlmoxOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Novo Almoxarifado</DialogTitle>
                        <DialogDescription>Crie um novo almoxarifado para esta obra.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={newAlmoxName} onChange={(e) => setNewAlmoxName(e.target.value)} placeholder="Ex: Almoxarifado Bloco C" />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateAlmoxOpen(false)}>Cancelar</Button>
                            <Button onClick={() => createAlmox.mutate({ nome: newAlmoxName, obra_id: obraId }, { onSuccess: () => { setCreateAlmoxOpen(false); setNewAlmoxName('') } })} disabled={!newAlmoxName.trim()} loading={createAlmox.isPending}>Criar</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Excluir Almoxarifado</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?{' '}
                            Todo o estoque e histórico de movimentações deste almoxarifado serão excluídos permanentemente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteTarget && deleteAlmox.mutate(deleteTarget.id, {
                                onSuccess: () => {
                                    setDeleteTarget(null)
                                    toast({ title: 'Almoxarifado excluído com sucesso' })
                                },
                                onError: () => toast({
                                    title: 'Erro ao excluir almoxarifado',
                                    description: 'Tente novamente ou contate o suporte.',
                                    variant: 'error',
                                }),
                            })}
                            loading={deleteAlmox.isPending}
                        >
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dar Baixa Dialog (Apple-style focused flow) ── */}
            <Dialog open={!!baixaTarget} onOpenChange={(v) => { if (!v) { setBaixaTarget(null); setBaixaQty(''); setBaixaObs('') } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Dar Baixa</DialogTitle>
                        <DialogDescription>Registre o uso/consumo de material nesta obra.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* Material + Almoxarifado info card */}
                        <div className="flex items-center gap-3.5 rounded-xl bg-accent/50 px-4 py-3.5">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-orange-500/10">
                                <Minus className="h-5 w-5 text-orange-500" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] sm:text-[13px] font-semibold truncate">{baixaTarget?.materialNome}</p>
                                <p className="text-[12px] text-muted-foreground">
                                    {baixaTarget?.almoxarifadoNome}
                                    {baixaTarget?.materialCodigo && <span> · <span className="font-mono">{baixaTarget.materialCodigo}</span></span>}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[18px] font-bold tabular-nums text-foreground">{formatNumber(baixaTarget?.quantidadeDisponivel ?? 0)}</p>
                                <p className="text-[11px] text-muted-foreground">{baixaTarget?.unidade} disponível</p>
                            </div>
                        </div>

                        {/* Quantity input — prominent */}
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

                        {/* Observation — optional */}
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

            {/* ═══════ VENDA DIALOG ═══════ */}
            <Dialog open={vendaDialog} onOpenChange={(v) => { if (!v) setVendaDialog(false) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}>
                                <Banknote className="h-4 w-4 text-white" />
                            </span>
                            Registrar Venda
                        </DialogTitle>
                        <DialogDescription>Informe o valor de venda desta obra para calcular o lucro.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* Investment summary */}
                        <div className="rounded-xl bg-accent/50 p-4 space-y-2">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Investimento Total</p>
                            {[
                                { label: 'Terreno', Icon: Landmark, color: '#AF52DE', value: custos?.valorTerreno ?? 0 },
                                { label: 'Burocracia', Icon: FileText, color: '#007AFF', value: custos?.valorBurocracia ?? 0 },
                                { label: 'Construção', Icon: Building2, color: '#FF9500', value: custos?.valorConstrucao ?? 0 },
                            ].map(({ label, Icon, color, value }) => (
                                <div key={label} className="flex items-center justify-between text-[12px]">
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <Icon className="h-3 w-3" style={{ color }} />{label}
                                    </span>
                                    <span className="font-medium tabular-nums">{formatCurrency(value)}</span>
                                </div>
                            ))}
                            <div className="border-t border-border/30 pt-2 mt-2">
                                <div className="flex items-center justify-between text-[13px]">
                                    <span className="font-semibold">Total Investido</span>
                                    <span className="font-bold tabular-nums">{formatCurrency(custos?.total ?? 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sale value input */}
                        <div className="space-y-2">
                            <Label className="text-[13px] font-semibold">Valor da Venda (R$)</Label>
                            <Input
                                ref={vendaInputRef}
                                type="number" step="0.01" min="0"
                                value={vendaInput}
                                onChange={(e) => setVendaInput(e.target.value)}
                                placeholder="0,00"
                                className="text-[18px] font-semibold tabular-nums h-14 text-center"
                                autoFocus
                            />
                        </div>

                        {/* Live profit preview */}
                        <AnimatePresence>
                            {vendaInput && Number(vendaInput) > 0 && (() => {
                                const venda = Number(vendaInput)
                                const investido = custos?.total ?? 0
                                const lucro = venda - investido
                                const isPositive = lucro >= 0
                                const margem = investido > 0 ? ((lucro / investido) * 100).toFixed(1) : '0.0'
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                                        className={cn(
                                            'rounded-xl p-4 text-center',
                                            isPositive ? 'bg-success/8 border border-success/20' : 'bg-destructive/8 border border-destructive/20',
                                        )}
                                    >
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            {isPositive
                                                ? <TrendingUp className="h-4 w-4 text-success" />
                                                : <TrendingDown className="h-4 w-4 text-destructive" />
                                            }
                                            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-destructive)' }}>
                                                {isPositive ? 'Lucro Estimado' : 'Prejuízo Estimado'}
                                            </span>
                                        </div>
                                        <p className={cn('text-[28px] font-bold tabular-nums tracking-tight', isPositive ? 'text-success' : 'text-destructive')}>
                                            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(lucro))}
                                        </p>
                                        <p className="text-[12px] text-muted-foreground mt-0.5">
                                            Margem: <span className={cn('font-semibold', isPositive ? 'text-success' : 'text-destructive')}>{isPositive ? '+' : ''}{margem}%</span>
                                        </p>
                                    </motion.div>
                                )
                            })()}
                        </AnimatePresence>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setVendaDialog(false)}>Cancelar</Button>
                            <Button
                                disabled={!vendaInput || Number(vendaInput) <= 0}
                                loading={updateOrcamento.isPending}
                                style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}
                                className="text-white border-0"
                                onClick={() => {
                                    const venda = Number(vendaInput)
                                    if (venda <= 0) return
                                    updateOrcamento.mutate(
                                        { id: obraId, status: 'VENDIDO', valor_venda: venda },
                                        {
                                            onSuccess: () => {
                                                setVendaDialog(false)
                                                toast({
                                                    title: 'Venda registrada',
                                                    description: `${obra?.nome} vendida por ${formatCurrency(venda)}`,
                                                    variant: 'success',
                                                })
                                            },
                                            onError: () => toast({ title: 'Erro ao registrar venda', variant: 'error' }),
                                        },
                                    )
                                }}
                            >
                                <Sparkles className="h-4 w-4 mr-1.5" />
                                Confirmar Venda
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════ RICH ENTRADA DIALOG ═══════ */}
            <Dialog open={entradaDialog} onOpenChange={(v) => { if (!v) resetEntrada(); else setEntradaDialog(true) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Entrada de Estoque</DialogTitle>
                        <DialogDescription>Registre a entrada de material em um almoxarifado desta obra.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* 1. Material */}
                        <div className="space-y-2">
                            <Label>Material</Label>
                            <Select value={entMaterialId} onValueChange={setEntMaterialId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger>
                                <SelectContent>
                                    {(materiais as any[]).map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.nome} <span className="text-muted-foreground ml-1">({m.codigo})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Material info chip */}
                        {selectedEntMaterial && (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent/50 px-4 py-3">
                                <Badge variant="secondary">{selectedEntMaterial.categoria?.nome}</Badge>
                                <span className="text-[13px] sm:text-[12px] text-muted-foreground">
                                    Unidade: <strong>{selectedEntMaterial.categoria?.unidade}</strong>
                                </span>
                                {selectedEntMaterial.preco_unitario > 0 && (
                                    <span className="text-[13px] sm:text-[12px] text-muted-foreground sm:ml-auto">
                                        Último: <strong>{formatCurrency(selectedEntMaterial.preco_unitario)}</strong>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* 2. Unidade */}
                        <div className="space-y-2">
                            <Label>Unidade</Label>
                            <Select value={entUnidade} onValueChange={setEntUnidade}>
                                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
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
                                <Input type="number" step="0.01" value={entQty} onChange={(e) => setEntQty(e.target.value)} placeholder="0" className="tabular-nums" />
                            </div>
                            <div className="space-y-2">
                                <Label>Preço Un. (R$)</Label>
                                <Input
                                    type="number" step="0.01"
                                    value={entPreco}
                                    onChange={(e) => setEntPreco(e.target.value)}
                                    placeholder={(selectedEntMaterial?.preco_unitario ?? 0) > 0 ? String(selectedEntMaterial!.preco_unitario) : '0,00'}
                                    className="tabular-nums"
                                />
                            </div>
                        </div>

                        {/* Subtotal preview */}
                        {entQty && Number(entQty) > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-accent/50 px-4 py-3">
                                <span className="text-[14px] sm:text-[13px] text-muted-foreground">Subtotal</span>
                                <span className="text-[18px] sm:text-[17px] font-bold tabular-nums">
                                    {formatCurrency(Number(entQty) * (Number(entPreco) || selectedEntMaterial?.preco_unitario || 0))}
                                </span>
                            </div>
                        )}

                        {/* 4. Almoxarifado (desta obra) */}
                        <div className="space-y-2">
                            <Label>Almoxarifado (destino)</Label>
                            <Select value={entAlmoxId} onValueChange={setEntAlmoxId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o almoxarifado" /></SelectTrigger>
                                <SelectContent>
                                    {(almoxarifados as any[]).map((a: any) => (
                                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 5. Forma de Pagamento */}
                        <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={entPagamento} onValueChange={setEntPagamento}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                                <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                                <SelectContent>
                                    {(fornecedoresData as any[]).map((f: any) => (
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
                            <Input value={entObs} onChange={(e) => setEntObs(e.target.value)} placeholder="Ex: Compra NF 12345" />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetEntrada}>Cancelar</Button>
                            <Button
                                disabled={!canSubmitEntrada}
                                loading={createEntrada.isPending}
                                onClick={() => createEntrada.mutate({
                                    p_material_id: entMaterialId,
                                    p_quantidade: Number(entQty),
                                    p_preco_unitario: Number(entPreco) || selectedEntMaterial?.preco_unitario || 0,
                                    p_almoxarifado_id: entAlmoxId,
                                    p_fornecedor_id: entFornecedorId || undefined,
                                    p_unidade: entUnidade || undefined,
                                    p_forma_pagamento: entPagamento || undefined,
                                    p_observacao: entObs || undefined,
                                }, {
                                    onSuccess: () => {
                                        toast({ title: 'Entrada registrada', description: 'O estoque foi atualizado.', variant: 'success' })
                                        resetEntrada()
                                    },
                                    onError: () => toast({ title: 'Erro ao registrar entrada', variant: 'error' }),
                                })}
                            >
                                Registrar Entrada
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={movDialog} onOpenChange={setMovDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Movimentação</DialogTitle>
                        <DialogDescription>Registre uma entrada, saída ou transferência de material.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* ── Tipo: segmented control Apple-style ── */}
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <div className="flex rounded-xl bg-muted/60 p-1 gap-1">
                                {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as const).map((t) => {
                                    const cfg = tipoConfig[t]
                                    const Icon = cfg.icon
                                    const active = movTipo === t
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => { setMovTipo(t); if (t !== 'TRANSFERENCIA') setMovAlmoxDestinoId('') }}
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[14px] sm:text-[13px] sm:py-2 font-medium transition-all',
                                                active
                                                    ? 'bg-card shadow-sm text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground/70',
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" style={{ color: active ? cfg.tint : undefined }} />
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── Material ── */}
                        <div className="space-y-2">
                            <Label>Material</Label>
                            <Select value={movMaterialId} onValueChange={setMovMaterialId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger>
                                <SelectContent>
                                    {materiais.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome} ({m.codigo})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ── Quantidade ── */}
                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input type="number" value={movQty} onChange={(e) => setMovQty(e.target.value)} placeholder="0" />
                        </div>

                        {/* ── Almoxarifado Origem ── */}
                        <div className="space-y-2">
                            <Label>{movTipo === 'TRANSFERENCIA' ? 'Almoxarifado Origem' : 'Almoxarifado'}</Label>
                            <Select value={movAlmoxId} onValueChange={setMovAlmoxId}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {almoxarifados.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ── Almoxarifado Destino (só para transferência) ── */}
                        {movTipo === 'TRANSFERENCIA' && (
                            <div className="space-y-2">
                                <Label>Almoxarifado Destino</Label>
                                <Select value={movAlmoxDestinoId} onValueChange={setMovAlmoxDestinoId}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                                    <SelectContent>
                                        {allAlmoxarifados
                                            .filter((a: any) => a.id !== movAlmoxId)
                                            .map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    {a.nome}{a.obra?.nome ? ` — ${a.obra.nome}` : ''}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[12px] text-muted-foreground">Transferências ficam pendentes até aprovação.</p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setMovDialog(false)}>Cancelar</Button>
                            <Button
                                onClick={handleCreateMov}
                                disabled={!movMaterialId || !movAlmoxId || !movQty || (movTipo === 'TRANSFERENCIA' && !movAlmoxDestinoId)}
                                loading={movPending}
                            >
                                {movTipo === 'TRANSFERENCIA' ? 'Solicitar Transferência' : 'Registrar'}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Zerar Estoque Dialog (cria SAIDA total) ── */}
            <Dialog open={!!deleteEstoqueTarget} onOpenChange={(v) => { if (!v) setDeleteEstoqueTarget(null) }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Zerar Estoque</DialogTitle>
                        <DialogDescription>
                            Será registrada uma saída de <strong>{formatNumber(deleteEstoqueTarget?.quantidade ?? 0)} {deleteEstoqueTarget?.unidade}</strong> de <strong>{deleteEstoqueTarget?.materialNome}</strong> do almoxarifado <strong>{deleteEstoqueTarget?.almoxarifadoNome}</strong>. Esta ação será registrada nas movimentações.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteEstoqueTarget(null)}>Cancelar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteEstoqueTarget && deleteEstoqueTarget.quantidade > 0 && createSaida.mutate({
                                p_material_id: deleteEstoqueTarget.materialId,
                                p_quantidade: deleteEstoqueTarget.quantidade,
                                p_preco_unitario: deleteEstoqueTarget.precoUnitario,
                                p_almoxarifado_id: deleteEstoqueTarget.almoxarifadoId,
                                p_observacao: 'Estoque zerado manualmente',
                            }, {
                                onSuccess: () => {
                                    toast({ title: 'Estoque zerado', description: 'Saída registrada nas movimentações.', variant: 'success' })
                                    setDeleteEstoqueTarget(null)
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

function Empty({ icon: Icon, text, sub }: { icon: typeof Package; text: string; sub: string }) {
    return (
        <div className="text-center py-16">
            <Icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-[13px] font-medium text-muted-foreground">{text}</p>
            <p className="text-[12px] text-muted-foreground/70 mt-0.5">{sub}</p>
        </div>
    )
}
