import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Landmark, CreditCard, Wallet, FileText,
    ArrowDownRight, ArrowUpRight, Plus, Trash2, Receipt, ChevronDown,
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
    numeroConta: string
    valorCaixa: number
    valorAplicado: number
}

interface MovimentacaoConta {
    id: string
    tipo: 'ENTRADA' | 'SAIDA'
    motivo: string
    valor: number
    data: string       // YYYY-MM-DD
    createdAt: string  // ISO timestamp
}

/* ─── Storage helpers ─── */
const CONTAS_KEY = 'financeiro_contas_v1'
const movKey = (id: string) => `financeiro_mov_${id}`

function loadContas(): Conta[] {
    try { return JSON.parse(localStorage.getItem(CONTAS_KEY) || '[]') } catch { return [] }
}
function loadMovs(contaId: string): MovimentacaoConta[] {
    try { return JSON.parse(localStorage.getItem(movKey(contaId)) || '[]') } catch { return [] }
}
function saveMovs(contaId: string, movs: MovimentacaoConta[]) {
    localStorage.setItem(movKey(contaId), JSON.stringify(movs))
}

/* ─── Date helpers ─── */
function todayStr() { return new Date().toISOString().split('T')[0] }
function weekAgoStr() {
    const d = new Date(); d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
}

/** Format ISO timestamp to full date + time in pt-BR: "14 de fev. de 2026 · 14:32" */
function formatDateTime(isoStr: string): string {
    if (!isoStr) return '—'
    const date = new Date(isoStr)
    const dateStr = date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
    const timeStr = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })
    return `${dateStr} · ${timeStr}`
}

function groupLabel(date: string): string {
    const today = todayStr()
    const weekAgo = weekAgoStr()
    if (date === today) return 'Hoje'
    if (date > weekAgo) return 'Esta Semana'
    return 'Anteriores'
}

/* ─── Accent palette ─── */
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

/* ─── SVG arc ring ─── */
function Ring({ percent, size = 96, stroke = 8, color }: { percent: number; size?: number; stroke?: number; color: string }) {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    return (
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(Math.min(percent, 100) / 100) * circ} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
            />
        </svg>
    )
}

/* ══════════════════════════════════════════════ */
export function ContaDetailPage() {
    const { contaId } = useParams({ strict: false }) as { contaId: string }
    const navigate = useNavigate()

    /* ─── Load conta ─── */
    const conta = useMemo(() => loadContas().find(c => c.id === contaId), [contaId])
    const accentIdx = useMemo(() => {
        if (!conta) return 0
        const all = loadContas()
        return all.findIndex(c => c.id === contaId) % accents.length
    }, [conta, contaId])
    const accent = accents[accentIdx]

    /* ─── All contas (for Conta selector in modal) ─── */
    const [allContas] = useState<Conta[]>(() => loadContas())

    /* ─── Movimentações ─── */
    const [movs, setMovs] = useState<MovimentacaoConta[]>(() => loadMovs(contaId))
    useEffect(() => { saveMovs(contaId, movs) }, [contaId, movs])

    /* ─── Computed totals ─── */
    const totalEntradas = useMemo(() => movs.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.valor, 0), [movs])
    const totalSaidas = useMemo(() => movs.filter(m => m.tipo === 'SAIDA').reduce((s, m) => s + m.valor, 0), [movs])
    const baseTotal = (conta?.valorCaixa ?? 0) + (conta?.valorAplicado ?? 0)
    const saldoAtual = baseTotal + totalEntradas - totalSaidas
    const caixaPct = saldoAtual > 0 ? Math.round(((conta?.valorCaixa ?? 0) / baseTotal) * 100) : 0

    /* ─── Grouped movs (sorted desc by date then createdAt) ─── */
    const grouped = useMemo(() => {
        const sorted = [...movs].sort((a, b) =>
            b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)
        )
        const order = ['Hoje', 'Esta Semana', 'Anteriores']
        const map = new Map<string, MovimentacaoConta[]>()
        for (const m of sorted) {
            const label = groupLabel(m.data)
            if (!map.has(label)) map.set(label, [])
            map.get(label)!.push(m)
        }
        return order.filter(k => map.has(k)).map(k => ({ label: k, items: map.get(k)! }))
    }, [movs])

    /* ─── Add movimentação modal ─── */
    const [modalOpen, setModalOpen] = useState(false)
    const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
    const [valor, setValor] = useState('')
    const [contaSelecionada, setContaSelecionada] = useState(contaId)
    const [motivo, setMotivo] = useState('')

    const resetModal = () => {
        setTipo('ENTRADA')
        setValor('')
        setContaSelecionada(contaId)
        setMotivo('')
    }

    const handleAdd = () => {
        if (!motivo.trim() || !valor) return
        const nova: MovimentacaoConta = {
            id: crypto.randomUUID(),
            tipo,
            motivo: motivo.trim(),
            valor: parseCurrency(valor),
            data: todayStr(),
            createdAt: new Date().toISOString(),
        }

        if (contaSelecionada === contaId) {
            // Add to current conta's state (auto-saved via useEffect)
            setMovs(prev => [nova, ...prev])
        } else {
            // Add to a different conta's localStorage directly
            const otherMovs = loadMovs(contaSelecionada)
            saveMovs(contaSelecionada, [nova, ...otherMovs])
        }

        setModalOpen(false)
        resetModal()
    }

    const handleDelete = (id: string) => setMovs(prev => prev.filter(m => m.id !== id))

    /* ─── Not found ─── */
    if (!conta) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Landmark className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-[17px] font-medium text-muted-foreground">Conta não encontrada</p>
                <Button variant="ghost" onClick={() => navigate({ to: '/financeiro' })}>
                    <ArrowLeft className="h-4 w-4 mr-2" />Voltar
                </Button>
            </div>
        )
    }

    /* ══════ RENDER ══════ */
    return (
        <div className="pb-20">

            {/* ─── Back nav + title ─── */}
            <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="px-4 md:px-6 pt-6 pb-2 flex items-center gap-3"
            >
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => navigate({ to: '/financeiro' })}
                    className="flex items-center gap-1 text-primary text-[17px] font-regular hover:opacity-70 transition-opacity"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Contas</span>
                </motion.button>
            </motion.div>

            {/* ─── Hero: bank identity ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="px-4 md:px-6 pt-4 pb-6"
            >
                <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-[16px] flex-shrink-0"
                        style={{ backgroundColor: accent.bg }}>
                        <Landmark className="h-7 w-7" style={{ color: accent.fg }} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight leading-none truncate">
                            {conta.banco}
                        </h1>
                        {conta.numeroConta && (
                            <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground mt-1.5">
                                <CreditCard className="h-3.5 w-3.5 opacity-50" />
                                {conta.numeroConta}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ─── Balance hero card ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="px-4 md:px-6"
            >
                <div className="rounded-2xl bg-card border p-5 md:p-6">
                    <div className="flex items-center gap-6 md:gap-8">
                        {/* Ring: caixa% of base */}
                        <div className="relative flex-shrink-0">
                            <Ring percent={caixaPct} size={96} stroke={8} color={accent.fg} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[18px] font-bold tabular-nums leading-none">{caixaPct}%</span>
                                <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">caixa</span>
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Saldo Atual</p>
                            <p className="text-[32px] md:text-[38px] font-bold tabular-nums tracking-tight leading-none">
                                {formatCurrency(saldoAtual)}
                            </p>
                            {(totalEntradas > 0 || totalSaidas > 0) && (
                                <p className={cn(
                                    'text-[13px] tabular-nums mt-1.5 font-medium',
                                    totalEntradas - totalSaidas >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'
                                )}>
                                    {totalEntradas - totalSaidas >= 0 ? '+' : ''}{formatCurrency(totalEntradas - totalSaidas)} em movimentações
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Caixa / Aplicado breakdown */}
                    <div className="flex gap-4 mt-5 pt-5 border-t border-border/20">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                                    style={{ backgroundColor: '#34C75914' }}>
                                    <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
                                </span>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Em caixa</p>
                            </div>
                            <p className="text-[18px] font-bold tabular-nums leading-tight" style={{ color: '#34C759' }}>
                                {formatCurrency(conta.valorCaixa)}
                            </p>
                        </div>

                        <div className="w-px bg-border/30" />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                                    style={{ backgroundColor: '#007AFF14' }}>
                                    <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
                                </span>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Aplicado</p>
                            </div>
                            <p className="text-[18px] font-bold tabular-nums leading-tight" style={{ color: '#007AFF' }}>
                                {formatCurrency(conta.valorAplicado)}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Movimentações ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="px-4 md:px-6 mt-8"
            >
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Movimentações</h2>
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => { resetModal(); setModalOpen(true) }}
                        className="flex items-center gap-1.5 text-[15px] text-primary font-medium hover:opacity-70 transition-opacity"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar
                    </motion.button>
                </div>

                <AnimatePresence mode="popLayout">
                    {movs.length === 0 ? (
                        /* Empty state */
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-border/50"
                        >
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
                                style={{ backgroundColor: '#8E8E9314' }}>
                                <Receipt className="h-7 w-7 text-muted-foreground/50" />
                            </span>
                            <p className="text-[17px] font-semibold">Sem movimentações</p>
                            <p className="text-[14px] text-muted-foreground mt-1 text-center max-w-[200px]">
                                Registre entradas e saídas desta conta
                            </p>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { resetModal(); setModalOpen(true) }}
                                className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-medium text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: accent.fg }}
                            >
                                <Plus className="h-4 w-4" />
                                Adicionar Movimentação
                            </motion.button>
                        </motion.div>
                    ) : (
                        /* Grouped transaction list */
                        <motion.div key="list" className="space-y-6">
                            {grouped.map((group, gi) => (
                                <motion.div
                                    key={group.label}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: gi * 0.06 }}
                                >
                                    {/* Group header */}
                                    <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                                        {group.label}
                                    </p>

                                    {/* Transactions card */}
                                    <div className="rounded-2xl bg-card border overflow-hidden divide-y divide-border/15">
                                        <AnimatePresence>
                                            {group.items.map((mov) => {
                                                const isEntrada = mov.tipo === 'ENTRADA'
                                                const tint = isEntrada ? '#34C759' : '#FF3B30'
                                                const Icon = isEntrada ? ArrowDownRight : ArrowUpRight
                                                return (
                                                    <motion.div
                                                        key={mov.id}
                                                        layout
                                                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                                        className="flex items-center gap-3 md:gap-4 px-4 py-3.5 group"
                                                    >
                                                        {/* Colored left accent bar */}
                                                        <div className="w-[3px] h-10 rounded-full flex-shrink-0 self-center"
                                                            style={{ backgroundColor: tint }} />

                                                        {/* Icon */}
                                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                                                            style={{ backgroundColor: `${tint}14` }}>
                                                            <Icon className="h-4 w-4" style={{ color: tint }} />
                                                        </span>

                                                        {/* Info */}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[15px] font-medium leading-snug truncate">
                                                                {mov.motivo}
                                                            </p>
                                                            <p className="text-[12px] text-muted-foreground mt-0.5 tabular-nums">
                                                                {formatDateTime(mov.createdAt)}
                                                            </p>
                                                        </div>

                                                        {/* Value + delete */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <p className="text-[16px] font-semibold tabular-nums"
                                                                style={{ color: tint }}>
                                                                {isEntrada ? '+' : '−'}{formatCurrency(mov.valor)}
                                                            </p>
                                                            <motion.button
                                                                whileTap={{ scale: 0.88 }}
                                                                onClick={() => handleDelete(mov.id)}
                                                                className="flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                                style={{ backgroundColor: '#FF3B3010' }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF3B30' }} />
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

            {/* ══════════════════════════════════════════
                MODAL: Nova Movimentação
            ══════════════════════════════════════════ */}
            <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetModal() }}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden gap-0">

                    {/* Header */}
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                                style={{ backgroundColor: tipo === 'ENTRADA' ? '#34C75914' : '#FF3B3014' }}>
                                {tipo === 'ENTRADA'
                                    ? <ArrowDownRight className="h-5 w-5" style={{ color: '#34C759' }} />
                                    : <ArrowUpRight className="h-5 w-5" style={{ color: '#FF3B30' }} />
                                }
                            </span>
                            <DialogTitle className="text-[18px] font-semibold tracking-tight">
                                Nova Movimentação
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-5 space-y-4">

                        {/* 1. Tipo — segmented control */}
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-foreground">Tipo</Label>
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40">
                                {(['ENTRADA', 'SAIDA'] as const).map((t) => {
                                    const active = tipo === t
                                    const color = t === 'ENTRADA' ? '#34C759' : '#FF3B30'
                                    const Icon = t === 'ENTRADA' ? ArrowDownRight : ArrowUpRight
                                    return (
                                        <motion.button
                                            key={t}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => setTipo(t)}
                                            className={cn(
                                                'flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[14px] font-medium transition-all',
                                                active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                            )}
                                            style={active ? { color } : {}}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {t === 'ENTRADA' ? 'Entrada' : 'Saída'}
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 2. Valor */}
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium"
                                style={{ color: tipo === 'ENTRADA' ? '#34C759' : '#FF3B30' }}>
                                Valor
                            </Label>
                            <CurrencyInput
                                placeholder="0,00"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                autoFocus
                                className="h-11 rounded-xl text-[15px]"
                            />
                        </div>

                        {/* 3. Conta */}
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-foreground">Conta</Label>
                            <div className="relative">
                                <select
                                    value={contaSelecionada}
                                    onChange={e => setContaSelecionada(e.target.value)}
                                    className={cn(
                                        'w-full h-11 rounded-xl border bg-transparent',
                                        'pl-4 pr-10 text-[15px] appearance-none cursor-pointer',
                                        'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-1 focus:ring-offset-background',
                                        'transition-colors',
                                    )}
                                >
                                    {allContas.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.banco}{c.numeroConta ? ` · ${c.numeroConta}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>

                        {/* 4. Motivo */}
                        <div className="space-y-1.5">
                            <Label className="text-[13px] font-medium text-foreground">Motivo</Label>
                            <Input
                                placeholder={tipo === 'ENTRADA' ? 'Ex: Depósito, Transferência recebida…' : 'Ex: Pagamento fornecedor, Compra…'}
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                className="h-11 rounded-xl text-[15px] placeholder:text-muted-foreground/40"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 pb-6">
                        <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl text-[15px] font-medium"
                            onClick={() => { setModalOpen(false); resetModal() }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-11 rounded-xl text-[15px] font-medium"
                            disabled={!motivo.trim() || !valor}
                            onClick={handleAdd}
                            style={{
                                backgroundColor: motivo.trim() && valor
                                    ? (tipo === 'ENTRADA' ? '#34C759' : '#FF3B30')
                                    : undefined,
                            }}
                        >
                            Registrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
