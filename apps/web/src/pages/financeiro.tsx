import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowDownRight, ArrowUpRight, ArrowLeftRight,
    AlertTriangle, ChevronRight, Landmark, Package, CheckCircle2, FileText, Building2,
    Plus, Trash2, CreditCard, Wallet,
} from 'lucide-react'
import { useDashboardStats, useDashboardCustoPorObra, useMovimentacoesRecentes, useEstoqueAlertas, useObras } from '@/hooks/use-supabase'
import { cn, formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { CurrencyInput, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/* ─── Types ─── */
interface Conta {
    id: string
    banco: string
    numeroConta: string
    valorCaixa: number
    valorAplicado: number
}

/* Apple System Colors */
const clr = { blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500' }

/* Accent palette for account cards */
const accents = [
    { bg: '#007AFF12', fg: '#007AFF' },
    { bg: '#34C75912', fg: '#34C759' },
    { bg: '#FF9F0A12', fg: '#FF9F0A' },
    { bg: '#AF52DE12', fg: '#AF52DE' },
    { bg: '#FF375F12', fg: '#FF375F' },
    { bg: '#5AC8FA12', fg: '#5AC8FA' },
    { bg: '#30B0C712', fg: '#30B0C7' },
    { bg: '#FF634712', fg: '#FF6347' },
]

/* SVG Ring */
function Ring({ percent, size = 80, stroke = 6, color }: { percent: number; size?: number; stroke?: number; color: string }) {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    return (
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted/40" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${(Math.min(percent, 100) / 100) * circ} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </svg>
    )
}

function ringColor(p: number) { return p > 90 ? clr.red : p > 70 ? clr.orange : clr.green }

const statusBreakdown = [
    { key: 'ATIVA', label: 'Ativa', color: '#34C759' },
    { key: 'TERRENO', label: 'Terreno', color: '#AF52DE' },
    { key: 'FINALIZADA', label: 'Finaliz.', color: '#8E8E93' },
    { key: 'VENDIDO', label: 'Vendido', color: '#5856D6' },
]

const tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
    ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: clr.green },
    SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: clr.red },
    TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: clr.blue },
}

const STORAGE_KEY = 'financeiro_contas_v1'

export function FinanceiroPage() {
    const navigate = useNavigate()

    const { data: stats } = useDashboardStats()
    const { data: recentMovs } = useMovimentacoesRecentes()
    const { data: custoPorObra } = useDashboardCustoPorObra()
    const { data: alertasData } = useEstoqueAlertas()
    const { data: obrasData } = useObras()

    const s = stats
    const movs = recentMovs || []
    const alertas = alertasData || []
    const pct = s?.orcamentoTotal && s.orcamentoTotal > 0 ? Math.round((s.custoTotal / s.orcamentoTotal) * 100) : 0

    /* Terrenos em Standby */
    const terrenosStandby = (obrasData || []).filter((o: any) => o.status === 'TERRENO')
    const totalTerrenos = terrenosStandby.reduce((sum: number, o: any) => sum + (o.valor_terreno ?? 0), 0)

    /* ─── Contas state (localStorage) ─── */
    const [contas, setContas] = useState<Conta[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    })

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contas))
    }, [contas])

    /* ─── Add Conta modal state ─── */
    const [modalOpen, setModalOpen] = useState(false)
    const [banco, setBanco] = useState('')
    const [numeroConta, setNumeroConta] = useState('')
    const [valorCaixa, setValorCaixa] = useState('')
    const [valorAplicado, setValorAplicado] = useState('')

    const resetForm = () => {
        setBanco(''); setNumeroConta(''); setValorCaixa(''); setValorAplicado('')
    }

    const handleOpenModal = () => {
        resetForm()
        setModalOpen(true)
    }

    const handleAddConta = () => {
        if (!banco.trim()) return
        const nova: Conta = {
            id: crypto.randomUUID(),
            banco: banco.trim(),
            numeroConta: numeroConta.trim(),
            valorCaixa: parseCurrency(valorCaixa),
            valorAplicado: parseCurrency(valorAplicado),
        }
        setContas(prev => [...prev, nova])
        setModalOpen(false)
        resetForm()
    }

    const handleDeleteConta = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setContas(prev => prev.filter(c => c.id !== id))
    }

    return (
        <div className="pb-16 pt-10">

            {/* ─── Financial Summary ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="px-4 md:px-6"
            >
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Orçamento Geral</h2>
                </div>
                <div className="rounded-2xl bg-card p-5 md:p-6">
                    <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:gap-8">
                        <div className="relative">
                            <Ring percent={pct} size={120} stroke={10} color={ringColor(pct)} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[24px] font-bold tabular-nums leading-none">{pct}%</span>
                                <span className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">usado</span>
                            </div>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-[26px] md:text-[34px] font-bold tabular-nums tracking-tight leading-none">
                                {formatCurrency(s?.custoTotal ?? 0)}
                            </p>
                            <p className="text-[15px] md:text-[17px] text-muted-foreground mt-2">
                                de {formatCurrency(s?.orcamentoTotal ?? 0)} em orçamento
                            </p>
                            <div className="flex justify-center md:justify-start gap-5 mt-4 pt-4 border-t border-border/20">
                                {statusBreakdown.map((st) => {
                                    const count = obrasData?.filter((o: any) => o.status === st.key).length ?? 0
                                    return (
                                        <motion.div
                                            key={st.key}
                                            className={cn('transition-opacity duration-300', count === 0 ? 'opacity-30' : 'opacity-100')}
                                            whileTap={{ scale: 0.94 }}
                                            onClick={() => navigate({ to: '/obras' })}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <p className="text-[20px] md:text-[22px] font-semibold tabular-nums leading-none">{count}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                                                <p className="text-[13px] text-muted-foreground">{st.label}</p>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Insights row ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="px-4 md:px-6 mt-6 grid grid-cols-2 gap-3 md:gap-4"
            >
                {/* Alertas de Estoque */}
                <div className="rounded-2xl bg-card p-4 md:p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                        style={{ backgroundColor: alertas.length > 0 ? '#FF3B3018' : '#8E8E9318' }}>
                        <AlertTriangle className="h-5 w-5" style={{ color: alertas.length > 0 ? clr.red : '#8E8E93' }} />
                    </span>
                    <p className="text-[24px] md:text-[28px] font-bold tabular-nums leading-none">{alertas.length}</p>
                    <p className="text-[13px] md:text-[15px] text-muted-foreground mt-1">
                        {alertas.length === 1 ? 'Alerta de estoque' : 'Alertas de estoque'}
                    </p>
                </div>

                {/* Terrenos em Standby */}
                <motion.div
                    className="rounded-2xl bg-card p-4 md:p-5 cursor-pointer"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate({ to: '/obras' })}
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                        style={{ backgroundColor: '#AF52DE18' }}>
                        <Landmark className="h-5 w-5" style={{ color: '#AF52DE' }} />
                    </span>
                    <p className="text-[18px] md:text-[20px] font-bold tabular-nums leading-none" style={{ color: terrenosStandby.length > 0 ? '#AF52DE' : undefined }}>
                        {formatCurrency(totalTerrenos)}
                    </p>
                    <p className="text-[13px] md:text-[15px] text-muted-foreground mt-1">
                        Terrenos em Standby
                        {terrenosStandby.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-semibold px-1"
                                style={{ backgroundColor: '#AF52DE', color: '#fff' }}>
                                {terrenosStandby.length}
                            </span>
                        )}
                    </p>
                </motion.div>
            </motion.div>

            {/* ─── Contas ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="mt-10 px-4 md:px-6"
            >
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Contas</h2>
                    <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={handleOpenModal}
                        className="flex items-center gap-1.5 text-[15px] md:text-[17px] text-primary font-medium hover:text-primary/80 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Conta
                    </motion.button>
                </div>

                <AnimatePresence mode="popLayout">
                    {contas.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-border/50"
                        >
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                                style={{ backgroundColor: '#007AFF10' }}>
                                <CreditCard className="h-7 w-7" style={{ color: '#007AFF' }} />
                            </span>
                            <p className="text-[17px] font-semibold">Nenhuma conta cadastrada</p>
                            <p className="text-[14px] text-muted-foreground mt-1 text-center max-w-[220px]">
                                Adicione suas contas bancárias para acompanhar o saldo
                            </p>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleOpenModal}
                                className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                                style={{ backgroundColor: '#007AFF' }}
                            >
                                <Plus className="h-4 w-4" />
                                Adicionar Conta
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            initial="hidden"
                            animate="show"
                            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                            {contas.map((conta, i) => {
                                const accent = accents[i % accents.length]
                                const total = conta.valorCaixa + conta.valorAplicado
                                return (
                                    <motion.div
                                        key={conta.id}
                                        layout
                                        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => navigate({ to: '/financeiro/$contaId', params: { contaId: conta.id } })}
                                        className="rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] p-5 md:p-6 relative overflow-hidden group cursor-pointer"
                                    >
                                        {/* Delete button */}
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => handleDeleteConta(conta.id, e)}
                                            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ backgroundColor: '#FF3B3014' }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" style={{ color: clr.red }} />
                                        </motion.button>

                                        {/* Bank icon */}
                                        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] mb-4"
                                            style={{ backgroundColor: accent.bg }}>
                                            <Landmark className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
                                        </span>

                                        {/* Bank name */}
                                        <p className="text-[15px] font-semibold truncate pr-8">{conta.banco}</p>

                                        {/* Account number */}
                                        {conta.numeroConta && (
                                            <p className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5 truncate">
                                                <CreditCard className="h-[11px] w-[11px] shrink-0 opacity-50" />
                                                <span className="truncate">{conta.numeroConta}</span>
                                            </p>
                                        )}

                                        {/* Total */}
                                        <p className="text-[24px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mt-3">
                                            {formatCurrency(total)}
                                        </p>

                                        {/* Breakdown */}
                                        <div className="flex items-stretch gap-3 mt-4 pt-4 border-t border-border/30">
                                            {/* Em caixa */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                                                        style={{ backgroundColor: '#34C75914' }}>
                                                        <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
                                                    </span>
                                                    <p className="text-[11px] text-muted-foreground">Em caixa</p>
                                                </div>
                                                <p className="text-[14px] font-semibold tabular-nums leading-none" style={{ color: '#34C759' }}>
                                                    {formatCurrency(conta.valorCaixa)}
                                                </p>
                                            </div>

                                            {/* Divider */}
                                            <div className="w-px bg-border/30 self-stretch" />

                                            {/* Aplicado */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                                                        style={{ backgroundColor: '#007AFF14' }}>
                                                        <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
                                                    </span>
                                                    <p className="text-[11px] text-muted-foreground">Aplicado</p>
                                                </div>
                                                <p className="text-[14px] font-semibold tabular-nums leading-none" style={{ color: '#007AFF' }}>
                                                    {formatCurrency(conta.valorAplicado)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ─── Alertas de Estoque (lista detalhada, sempre visível) ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="px-4 md:px-6 mt-10"
            >
                <div className="rounded-2xl bg-card overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-4 md:px-5 pt-4 pb-3 border-b border-border/20">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                            style={{ backgroundColor: alertas.length > 0 ? '#FF3B3018' : '#34C75918' }}>
                            {alertas.length > 0
                                ? <AlertTriangle className="h-4 w-4" style={{ color: clr.red }} />
                                : <CheckCircle2 className="h-4 w-4" style={{ color: clr.green }} />
                            }
                        </span>
                        <div>
                            <p className="text-[15px] font-semibold leading-none">
                                {alertas.length > 0 ? 'Itens com Estoque Baixo' : 'Estoque em Dia'}
                            </p>
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                                {alertas.length > 0
                                    ? `${alertas.length} ${alertas.length === 1 ? 'material abaixo do mínimo' : 'materiais abaixo do mínimo'}`
                                    : 'Nenhum item abaixo do estoque mínimo'
                                }
                            </p>
                        </div>
                    </div>

                    {alertas.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 px-4 gap-2">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full"
                                style={{ backgroundColor: '#34C75918' }}>
                                <CheckCircle2 className="h-6 w-6" style={{ color: clr.green }} />
                            </div>
                            <p className="text-[15px] font-semibold mt-1">Todos os materiais em dia</p>
                            <p className="text-[13px] text-muted-foreground text-center max-w-[220px]">
                                Todos os estoques estão acima do mínimo requerido
                            </p>
                        </div>
                    )}

                    {alertas.map((alerta: any, i: number) => {
                        const qty = alerta.quantidade ?? 0
                        const min = alerta.estoque_minimo ?? 0
                        const isCritical = qty === 0
                        const pctStock = min > 0 ? Math.min((qty / min) * 100, 100) : 0
                        const accentColor = isCritical ? clr.red : clr.orange
                        return (
                            <div
                                key={alerta.id}
                                className={cn(
                                    'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5',
                                    i > 0 && 'border-t border-border/15',
                                )}
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                                    style={{ backgroundColor: `${accentColor}14` }}>
                                    <Package className="h-4 w-4" style={{ color: accentColor }} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-[15px] font-medium truncate leading-snug">{alerta.material_nome ?? '—'}</p>
                                        <span
                                            className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: isCritical ? '#FF3B3018' : '#FF950018',
                                                color: accentColor,
                                            }}
                                        >
                                            {isCritical ? 'Sem estoque' : 'Estoque baixo'}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-muted-foreground truncate">
                                        {alerta.almoxarifado_nome ?? '—'} · {alerta.obra_nome ?? '—'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 h-[3px] rounded-full bg-muted/60 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{ width: `${pctStock}%`, backgroundColor: accentColor }}
                                            />
                                        </div>
                                        <span className="text-[11px] tabular-nums text-muted-foreground flex-shrink-0">
                                            {formatNumber(qty)} / {formatNumber(min)} un.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </motion.div>

            {/* ─── Atividade Recente ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className="px-4 md:px-6 mt-10"
            >
                <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Atividade Recente</h2>
                    <button onClick={() => navigate({ to: '/movimentacoes' })} className="text-[15px] md:text-[17px] text-primary flex items-center hover:text-primary/80 transition-colors">
                        Ver Todas<ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                </div>
                <div className="rounded-2xl bg-card overflow-hidden">
                    {movs.length === 0 ? (
                        <p className="text-[17px] text-muted-foreground text-center py-12">Nenhuma movimentação.</p>
                    ) : (
                        movs.map((mov: any, i: number) => {
                            const t = tipos[mov.tipo] ?? tipos.ENTRADA
                            const Icon = t.icon
                            const cost = mov.quantidade * (mov.precoUnitario ?? mov.preco_unitario ?? mov.material?.preco_unitario ?? 0)
                            return (
                                <div
                                    key={mov.id}
                                    className={cn(
                                        'flex items-center gap-3 md:gap-4 px-4 md:px-5 min-h-[56px] md:min-h-[64px] py-3',
                                        i > 0 && 'border-t border-border/20',
                                    )}
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                                        style={{ backgroundColor: `${t.tint}14` }}>
                                        <Icon className="h-5 w-5" style={{ color: t.tint }} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] md:text-[17px] font-medium truncate">{mov.material?.nome ?? '—'}</p>
                                        <p className="text-[13px] md:text-[15px] text-muted-foreground">
                                            {t.label} · {formatNumber(mov.quantidade)} un
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={cn(
                                            'text-[17px] font-semibold tabular-nums',
                                            mov.tipo === 'SAIDA' ? 'text-destructive' : 'text-success'
                                        )}>
                                            {mov.tipo === 'SAIDA' ? '−' : '+'}{formatCurrency(cost)}
                                        </p>
                                        <p className="text-[13px] text-muted-foreground tabular-nums">{formatDate(mov.created_at)}</p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </motion.div>

            {/* ─── Modal: Nova Conta ─── */}
            <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                                style={{ backgroundColor: '#007AFF12' }}>
                                <Landmark className="h-5 w-5" style={{ color: '#007AFF' }} />
                            </span>
                            <DialogTitle className="text-[18px] font-semibold tracking-tight">Nova Conta</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-5 space-y-4">
                        {/* Nome do banco */}
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-foreground">Nome do banco</Label>
                            <Input
                                placeholder="Ex: Itaú, Nubank, Bradesco…"
                                value={banco}
                                onChange={e => setBanco(e.target.value)}
                                autoFocus
                                className="h-11 rounded-xl text-[15px] placeholder:text-muted-foreground/40"
                            />
                        </div>

                        {/* Número da conta */}
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-foreground">Número da conta</Label>
                            <Input
                                placeholder="Ex: 12345-6"
                                value={numeroConta}
                                onChange={e => setNumeroConta(e.target.value)}
                                className="h-11 rounded-xl text-[15px] placeholder:text-muted-foreground/40"
                            />
                        </div>

                        {/* Valores em grid 2 colunas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium" style={{ color: '#34C759' }}>Valor em caixa</Label>
                                <CurrencyInput
                                    placeholder="0,00"
                                    value={valorCaixa}
                                    onChange={e => setValorCaixa(e.target.value)}
                                    className="h-11 rounded-xl text-[15px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium" style={{ color: '#007AFF' }}>Valor aplicado</Label>
                                <CurrencyInput
                                    placeholder="0,00"
                                    value={valorAplicado}
                                    onChange={e => setValorAplicado(e.target.value)}
                                    className="h-11 rounded-xl text-[15px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-3 px-6 pb-6">
                        <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl text-[15px] font-medium"
                            onClick={() => { setModalOpen(false); resetForm() }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-11 rounded-xl text-[15px] font-medium"
                            disabled={!banco.trim()}
                            onClick={handleAddConta}
                            style={{ backgroundColor: banco.trim() ? '#007AFF' : undefined }}
                        >
                            Adicionar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
