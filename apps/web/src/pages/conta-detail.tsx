import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Landmark, CreditCard, Wallet, FileText,
    ArrowDownRight, ArrowUpRight, Plus, Trash2, Receipt, X,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { CurrencyInput, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/* ─── Types ─── */
interface Conta {
    id: string
    banco: string
    agencia: string
    numeroConta: string
    valorCaixa: number
    valorAplicado: number
}

interface MovimentacaoConta {
    id: string
    tipo: 'ENTRADA' | 'SAIDA'
    subconta: 'CAIXA' | 'APLICADO'
    motivo: string
    valor: number
    data: string
    createdAt: string
}

/* ─── UUID polyfill (crypto.randomUUID not available or crashing on iOS < 15.4 / non-https) ─── */
function uuid(): string {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
    } catch (e) { /* fallback */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

/* ─── Storage ─── */
const CONTAS_KEY = 'financeiro_contas_v1'
const movKey = (id: string) => `financeiro_mov_${id}`

function loadContas(): Conta[] {
    try { return JSON.parse(localStorage.getItem(CONTAS_KEY) || '[]') } catch { return [] }
}
function loadMovs(id: string): MovimentacaoConta[] {
    try { return JSON.parse(localStorage.getItem(movKey(id)) || '[]') } catch { return [] }
}
function saveMovs(id: string, list: MovimentacaoConta[]) {
    localStorage.setItem(movKey(id), JSON.stringify(list))
}
function saveContas(list: Conta[]) {
    localStorage.setItem(CONTAS_KEY, JSON.stringify(list))
}

/* ─── Dates ─── */
function todayStr() { return new Date().toISOString().split('T')[0] }
function weekAgoStr() {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
}
function formatDateTime(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function groupLabel(date: string): string {
    if (date === todayStr()) return 'Hoje'
    if (date > weekAgoStr()) return 'Esta Semana'
    return 'Anteriores'
}

/* ─── Palette ─── */
const accents = [
    { bg: '#007AFF12', fg: '#007AFF' }, { bg: '#34C75912', fg: '#34C759' },
    { bg: '#FF9F0A12', fg: '#FF9F0A' }, { bg: '#AF52DE12', fg: '#AF52DE' },
    { bg: '#FF375F12', fg: '#FF375F' }, { bg: '#5AC8FA12', fg: '#5AC8FA' },
    { bg: '#30B0C712', fg: '#30B0C7' }, { bg: '#FF634712', fg: '#FF6347' },
]

/* ─── Ring ─── */
function Ring({ percent, size = 88, stroke = 8, color }: { percent: number; size?: number; stroke?: number; color: string }) {
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    return (
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(Math.min(percent, 100) / 100) * c} ${c}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
            />
        </svg>
    )
}

/* ─── Segmented button ─── */
function SegBtn({
    active, color, onClick, children, layoutId
}: {
    active: boolean; color: string; onClick: () => void; children: React.ReactNode; layoutId: string
}) {
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            className={cn(
                'relative flex items-center justify-center gap-1.5 rounded-[12px] text-[15px] font-medium transition-colors min-h-[46px] z-10',
                active ? '' : 'text-muted-foreground hover:text-foreground',
            )}
            style={{ color: active ? color : undefined }}
        >
            {active && (
                <motion.div
                    layoutId={layoutId}
                    className="absolute inset-0 bg-card rounded-[12px] shadow-sm border border-black/5 dark:border-white/5 -z-10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
            )}
            {children}
        </motion.button>
    )
}

/* ══════════════════════════════ */
export function ContaDetailPage() {
    const { contaId } = useParams({ strict: false }) as { contaId: string }
    const navigate = useNavigate()

    const [contasAll, setContasAll] = useState<Conta[]>(() => loadContas())
    const conta = useMemo(() => contasAll.find(c => c.id === contaId), [contasAll, contaId])
    const accentIdx = useMemo(() => {
        if (!conta) return 0
        return contasAll.findIndex(c => c.id === contaId) % accents.length
    }, [conta, contaId, contasAll])
    const accent = accents[accentIdx]

    const [movs, setMovs] = useState<MovimentacaoConta[]>(() => loadMovs(contaId))
    useEffect(() => { saveMovs(contaId, movs) }, [contaId, movs])
    useEffect(() => { saveContas(contasAll) }, [contasAll])

    const baseTotal = (conta?.valorCaixa ?? 0) + (conta?.valorAplicado ?? 0)
    const saldoAtual = baseTotal   // caixa + aplicado
    const caixaPct = baseTotal > 0 ? Math.round(((conta?.valorCaixa ?? 0) / baseTotal) * 100) : 0

    const grouped = useMemo(() => {
        const sorted = [...movs].sort((a, b) => {
            const dA = String(a?.data || '')
            const dB = String(b?.data || '')
            if (dB !== dA) return dB.localeCompare(dA)
            const cA = String(a?.createdAt || '')
            const cB = String(b?.createdAt || '')
            return cB.localeCompare(cA)
        })
        const order = ['Hoje', 'Esta Semana', 'Anteriores']
        const map = new Map<string, MovimentacaoConta[]>()
        for (const m of sorted) {
            const lbl = groupLabel(m.data)
            if (!map.has(lbl)) map.set(lbl, [])
            map.get(lbl)!.push(m)
        }
        return order.filter(k => map.has(k)).map(k => ({ label: k, items: map.get(k)! }))
    }, [movs])

    /* ─── Modal ─── */
    const [open, setOpen] = useState(false)
    const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
    const [valor, setValor] = useState('')
    const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')
    const [motivo, setMotivo] = useState('')

    function reset() { setTipo('ENTRADA'); setValor(''); setSubconta('CAIXA'); setMotivo('') }

    function handleAdd() {
        const v = parseCurrency(valor)
        if (!motivo.trim() || !v || !conta) return

        const isEntrada = tipo === 'ENTRADA'
        const isCaixa = subconta === 'CAIXA'

        // 1. Atualizar Saldo
        setContasAll(prevContas => prevContas.map(c => {
            if (c.id !== conta.id) return c
            const prevCaixa = Number(c.valorCaixa) || 0
            const prevAplicado = Number(c.valorAplicado) || 0
            return {
                ...c,
                valorCaixa: isCaixa ? prevCaixa + (isEntrada ? v : -v) : prevCaixa,
                valorAplicado: !isCaixa ? prevAplicado + (isEntrada ? v : -v) : prevAplicado
            }
        }))

        // 2. Criar Transação
        setMovs(prev => [{
            id: uuid(), tipo, subconta,
            motivo: motivo.trim(), valor: v,
            data: todayStr(), createdAt: new Date().toISOString(),
        }, ...prev])
        setOpen(false)
        reset()
    }

    function handleDeleteMov(mov: MovimentacaoConta) {
        if (!conta) return
        const isEntrada = mov.tipo === 'ENTRADA'
        const isCaixa = mov.subconta === 'CAIXA'

        // Estorno Lógico Inverso do Saldo
        setContasAll(prevContas => prevContas.map(c => {
            if (c.id !== conta.id) return c
            const prevCaixa = Number(c.valorCaixa) || 0
            const prevAplicado = Number(c.valorAplicado) || 0
            return {
                ...c,
                valorCaixa: isCaixa ? prevCaixa + (isEntrada ? -mov.valor : mov.valor) : prevCaixa,
                valorAplicado: !isCaixa ? prevAplicado + (isEntrada ? -mov.valor : mov.valor) : prevAplicado
            }
        }))

        // Remove a movimentação da história
        setMovs(p => p.filter(m => m.id !== mov.id))
    }

    /* ─── Not found ─── */
    if (!conta) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Landmark className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-[17px] font-medium text-muted-foreground">Conta não encontrada</p>
            <Button variant="ghost" onClick={() => navigate({ to: '/financeiro' })}>
                <ArrowLeft className="h-4 w-4 mr-2" />Voltar
            </Button>
        </div>
    )

    const subLabel = [conta.agencia ? `Ag. ${conta.agencia}` : '', conta.numeroConta].filter(Boolean).join(' · ')

    /* ══════ RENDER ══════ */
    return (
        <div className="pb-24">

            {/* Back nav */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className="px-4 md:px-6 pt-6 pb-2">
                <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => navigate({ to: '/financeiro' })}
                    className="flex items-center gap-1 text-[17px] font-medium text-primary hover:opacity-70 transition-opacity min-h-[44px]">
                    <ArrowLeft className="h-5 w-5" /><span>Contas</span>
                </motion.button>
            </motion.div>

            {/* Hero identity */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
                className="px-4 md:px-6 pt-3 pb-6">
                <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-[16px] flex-shrink-0"
                        style={{ backgroundColor: accent.bg }}>
                        <Landmark className="h-7 w-7" style={{ color: accent.fg }} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-none truncate">{conta.banco}</h1>
                        {subLabel && (
                            <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground mt-1.5">
                                <CreditCard className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                                <span className="truncate">{subLabel}</span>
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Balance card */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
                className="px-4 md:px-6">
                <div className="rounded-2xl bg-card border p-5 md:p-6">
                    <div className="flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                            <Ring percent={caixaPct} color={accent.fg} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[17px] font-bold tabular-nums leading-none">{caixaPct}%</span>
                                <span className="text-[8px] text-muted-foreground mt-0.5 uppercase tracking-wider">caixa</span>
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Saldo Atual</p>
                            <p className="text-[28px] md:text-[36px] font-bold tabular-nums tracking-tight leading-none">
                                {formatCurrency(saldoAtual)}
                            </p>
                        </div>
                    </div>

                    {/* Caixa / Aplicado */}
                    <div className="flex gap-4 mt-5 pt-5 border-t border-border/10">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-[6px] flex-shrink-0" style={{ backgroundColor: '#34C75914' }}>
                                    <Wallet className="h-[14px] w-[14px]" style={{ color: '#34C759' }} />
                                </span>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Em caixa</p>
                            </div>
                            <p className="text-[18px] font-bold tabular-nums tracking-tight" style={{ color: '#34C759' }}>{formatCurrency(conta.valorCaixa)}</p>
                        </div>
                        <div className="w-px bg-border/20" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-[6px] flex-shrink-0" style={{ backgroundColor: '#007AFF14' }}>
                                    <FileText className="h-[14px] w-[14px]" style={{ color: '#007AFF' }} />
                                </span>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Aplicado</p>
                            </div>
                            <p className="text-[18px] font-bold tabular-nums tracking-tight" style={{ color: '#007AFF' }}>{formatCurrency(conta.valorAplicado)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Movimentações */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
                className="px-4 md:px-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Movimentações</h2>
                    <motion.button whileTap={{ scale: 0.93 }}
                        onClick={() => { reset(); setOpen(true) }}
                        className="flex items-center gap-1.5 text-[15px] text-primary font-medium hover:opacity-70 transition-opacity min-h-[44px] px-1">
                        <Plus className="h-4 w-4" />Adicionar
                    </motion.button>
                </div>

                <AnimatePresence mode="popLayout">
                    {movs.length === 0 ? (
                        <motion.div key="empty"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: '#8E8E9314' }}>
                                <Receipt className="h-7 w-7 text-muted-foreground/40" />
                            </span>
                            <p className="text-[17px] font-semibold">Sem movimentações</p>
                            <p className="text-[14px] text-muted-foreground mt-1.5 text-center max-w-[200px]">Registre entradas e saídas desta conta</p>
                            <motion.button whileTap={{ scale: 0.95 }}
                                onClick={() => { reset(); setOpen(true) }}
                                className="mt-6 flex items-center gap-1.5 px-5 py-3 rounded-xl text-[15px] font-medium text-white"
                                style={{ backgroundColor: accent.fg }}>
                                <Plus className="h-4 w-4" />Adicionar Movimentação
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div key="list" className="space-y-6">
                            {grouped.map((group, gi) => (
                                <motion.div key={group.label}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.28, delay: gi * 0.06 }}>
                                    <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                                        {group.label}
                                    </p>
                                    <div className="rounded-[24px] bg-card/60 backdrop-blur-md border border-border/40 shadow-sm overflow-hidden mb-6">
                                        <AnimatePresence initial={false}>
                                            {group.items.map((mov, i) => {
                                                const isE = mov.tipo === 'ENTRADA'
                                                const tint = isE ? '#34C759' : '#FF3B30'
                                                const typeLbl = isE ? 'Entrada' : 'Saída'
                                                const Icon = isE ? ArrowDownRight : ArrowUpRight
                                                const sc = mov.subconta ?? 'CAIXA'
                                                const scLbl = sc === 'CAIXA' ? 'Caixa' : 'Aplicado'
                                                return (
                                                    <motion.div key={mov.id} layout
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                                                        className={cn(
                                                            'flex items-center gap-3.5 md:gap-4 px-4 md:px-5 py-4 group overflow-hidden transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015]',
                                                            i > 0 && 'border-t border-border/30'
                                                        )}>
                                                        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] flex-shrink-0"
                                                            style={{ backgroundColor: `${tint}14` }}>
                                                            <Icon className="h-5 w-5" style={{ color: tint }} />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[16px] md:text-[17px] font-semibold tracking-tight leading-snug break-words">
                                                                {mov.motivo}
                                                            </p>
                                                            <p className="text-[13px] font-medium text-muted-foreground mt-0.5 opacity-80">
                                                                {typeLbl} <span className="mx-1 text-border/50">•</span> {scLbl === 'Aplicado' ? 'Aplicação' : scLbl}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                                                            <div className="text-right">
                                                                <p className={cn(
                                                                    'text-[17px] font-bold tracking-tight tabular-nums',
                                                                    isE ? 'text-[#34C759]' : 'text-foreground'
                                                                )}>
                                                                    {isE ? '+' : '−'}{formatCurrency(mov.valor)}
                                                                </p>
                                                                <p className="text-[12px] font-medium text-muted-foreground tabular-nums opacity-60 mt-0.5">
                                                                    {formatDateTime(mov.createdAt)}
                                                                </p>
                                                            </div>
                                                            <motion.button whileTap={{ scale: 0.88 }}
                                                                onClick={() => handleDeleteMov(mov)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                                style={{ backgroundColor: '#FF3B3012' }}>
                                                                <Trash2 className="h-4 w-4" style={{ color: '#FF3B30' }} />
                                                            </motion.button>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ══════ MODAL PREMIUM APPLE ══════ */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
                <DialogContent className="max-w-[90vw] sm:max-w-[420px] rounded-[28px] p-0 gap-0 shadow-2xl border border-white/10 bg-background/85 backdrop-blur-2xl dark:bg-zinc-900/80 flex flex-col max-h-[90dvh] overflow-hidden">

                    {/* Header Premium Apple */}
                    <DialogHeader className="px-5 sm:px-6 pt-7 sm:pt-8 pb-5 sm:pb-6 relative z-10 border-b border-border/10">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setOpen(false); reset() }}
                            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                        >
                            <X className="h-[18px] w-[18px] text-muted-foreground" />
                        </motion.button>

                        <div className="flex flex-col items-center justify-center text-center gap-3">
                            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] shadow-sm flex-shrink-0"
                                style={{ backgroundColor: tipo === 'ENTRADA' ? '#34C75918' : '#FF3B3018' }}>
                                {tipo === 'ENTRADA'
                                    ? <ArrowDownRight className="h-7 w-7" style={{ color: '#34C759' }} />
                                    : <ArrowUpRight className="h-7 w-7" style={{ color: '#FF3B30' }} />}
                            </span>
                            <div>
                                <DialogTitle className="text-[22px] font-semibold tracking-tight leading-none mb-1.5">Nova Movimentação</DialogTitle>
                                <p className="text-[14px] text-muted-foreground">Registre os detalhes da transação</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Corpos Formulário - Apple Form Style */}
                    <div className="px-5 sm:px-6 py-6 sm:py-7 space-y-6 sm:space-y-7 bg-black/[0.02] dark:bg-white/[0.02] overflow-y-auto flex-1">

                        {/* 1 — Tipo */}
                        <div className="space-y-2.5">
                            <Label className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest pl-1">Tipo de Operação</Label>
                            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-[16px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 shadow-inner relative">
                                <SegBtn active={tipo === 'ENTRADA'} color="#34C759" onClick={() => setTipo('ENTRADA')} layoutId="tipo-bg">
                                    <div className="flex items-center gap-2">
                                        <ArrowDownRight className="h-4 w-4" />Entrada
                                    </div>
                                </SegBtn>
                                <SegBtn active={tipo === 'SAIDA'} color="#FF3B30" onClick={() => setTipo('SAIDA')} layoutId="tipo-bg">
                                    <div className="flex items-center gap-2">
                                        <ArrowUpRight className="h-4 w-4" />Saída
                                    </div>
                                </SegBtn>
                            </div>
                        </div>

                        {/* 3 — Conta (Em Caixa / Aplicado) */}
                        <div className="space-y-2.5">
                            <Label className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest pl-1">Conta de Destino</Label>
                            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-[16px] bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 shadow-inner relative">
                                <SegBtn active={subconta === 'CAIXA'} color="#34C759" onClick={() => setSubconta('CAIXA')} layoutId="conta-bg">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4" />Caixa Principal
                                    </div>
                                </SegBtn>
                                <SegBtn active={subconta === 'APLICADO'} color="#007AFF" onClick={() => setSubconta('APLICADO')} layoutId="conta-bg">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />Aplicação
                                    </div>
                                </SegBtn>
                            </div>
                        </div>

                        {/* 4 — Motivo e Valor (Agrupados Visualmente) */}
                        <div className="space-y-5 pt-1">
                            <div className="space-y-2">
                                <Label className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest pl-1">Descrição</Label>
                                <Input
                                    placeholder={tipo === 'ENTRADA' ? 'Ex: Depósito, Transferência…' : 'Ex: Pagamento, Compra…'}
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    className="h-[54px] rounded-2xl text-[16px] px-4 font-medium bg-background/50 backdrop-blur-sm border-black/10 dark:border-white/10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[12px] font-semibold uppercase tracking-widest pl-1"
                                    style={{ color: tipo === 'ENTRADA' ? '#34C759' : '#FF3B30' }}>
                                    Valor da Operação
                                </Label>
                                <CurrencyInput
                                    placeholder="0,00"
                                    value={valor}
                                    onChange={e => setValor(e.target.value)}
                                    className="h-[54px] rounded-2xl text-[18px] px-4 font-bold bg-background/50 backdrop-blur-sm border-black/10 dark:border-white/10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer - Apple Large Buttons (Safe Area padding on Mobile) */}
                    <div className="flex gap-3 px-5 sm:px-6 pb-8 sm:pb-7 pt-5 relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border/20 before:to-transparent">
                        <Button variant="outline" className="flex-1 h-[56px] rounded-[18px] text-[16px] font-semibold bg-white/50 dark:bg-black/20 backdrop-blur shadow-sm border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            onClick={() => { setOpen(false); reset() }}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-[56px] rounded-[18px] text-[16px] font-bold text-white shadow-md shadow-black/10 hover:opacity-90 transition-all cursor-pointer active:scale-[0.96] disabled:active:scale-100 disabled:opacity-50"
                            disabled={!motivo.trim() || !parseCurrency(valor)}
                            onClick={handleAdd}
                            style={{
                                backgroundColor: motivo.trim() && parseCurrency(valor)
                                    ? (tipo === 'ENTRADA' ? '#34C759' : '#FF3B30')
                                    : '#8E8E93',
                            }}>
                            Confirmar Transação
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
