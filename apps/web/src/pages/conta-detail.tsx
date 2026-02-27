import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Landmark, CreditCard, Wallet, FileText,
    ArrowDownRight, ArrowUpRight, ArrowLeftRight,
    Plus, Trash2, Receipt, X, Check,
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

type TipoMov = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

interface MovimentacaoConta {
    id: string
    tipo: TipoMov
    subconta: 'CAIXA' | 'APLICADO'
    motivo: string
    valor: number
    data: string
    createdAt: string
    /** 'SWITCH' = troca interna Caixa↔Aplicado · contaId = outra conta cadastrada */
    transferenciaDestinoId?: string
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

/* ─── Tipo config ─── */
const TIPO_CFG: Record<TipoMov, { label: string; btnLabel: string; Icon: React.ElementType; color: string; iconBg: string }> = {
    ENTRADA:       { label: 'Entrada',    btnLabel: 'Confirmar',    Icon: ArrowDownRight, color: '#34C759', iconBg: '#34C75918' },
    SAIDA:         { label: 'Saída',      btnLabel: 'Confirmar',    Icon: ArrowUpRight,   color: '#FF3B30', iconBg: '#FF3B3018' },
    TRANSFERENCIA: { label: 'Transferir', btnLabel: 'Transferir',   Icon: ArrowLeftRight, color: '#007AFF', iconBg: '#007AFF18' },
}

/* subconta display label — "APLICADO" → "Aplicações" everywhere */
const SUBCONTA_LABEL: Record<'CAIXA' | 'APLICADO', string> = {
    CAIXA: 'Em Caixa',
    APLICADO: 'Aplicações',
}

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

/* ─── Segmented button (2-option) ─── */
function SegBtn({
    active, color, onClick, children, layoutId
}: {
    active: boolean; color: string; onClick: () => void; children: React.ReactNode; layoutId: string
}) {
    return (
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick}
            className={cn(
                'relative flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium transition-colors min-h-[42px] z-10 flex-1',
                active ? '' : 'text-muted-foreground hover:text-foreground',
            )}
            style={{ color: active ? color : undefined }}>
            {active && (
                <motion.div layoutId={layoutId}
                    className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-black/5 dark:border-white/5 -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />
            )}
            {children}
        </motion.button>
    )
}

/* ─── Destino card (transfer destination) ─── */
function DestinoCard({
    selected, onSelect, icon: Icon, color, iconBg, title, subtitle,
}: {
    selected: boolean; onSelect: () => void
    icon: React.ElementType; color: string; iconBg: string; title: string; subtitle: string
}) {
    return (
        <motion.button whileTap={{ scale: 0.985 }} type="button" onClick={onSelect}
            className={cn(
                'w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] border text-left transition-all',
                selected
                    ? 'border-border/40 bg-card shadow-sm'
                    : 'border-border/15 bg-black/[0.015] dark:bg-white/[0.025] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
            )}>
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0"
                style={{ backgroundColor: iconBg }}>
                <Icon className="h-[18px] w-[18px]" style={{ color }} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-tight tracking-tight">{title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            </div>
            <AnimatePresence>
                {selected && (
                    <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}>
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color }} />
                    </motion.span>
                )}
            </AnimatePresence>
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
    const saldoAtual = baseTotal
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

    /* ─── Outras contas (para destino de transferência) ─── */
    const outrasContas = useMemo(() => contasAll.filter(c => c.id !== contaId), [contasAll, contaId])

    /* ─── Modal state ─── */
    const [open, setOpen] = useState(false)
    const [tipo, setTipo] = useState<TipoMov>('ENTRADA')
    const [valor, setValor] = useState('')
    const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')
    const [motivo, setMotivo] = useState('')
    const [transferenciaDestino, setTransferenciaDestino] = useState<string>('SWITCH')

    function reset() {
        setTipo('ENTRADA')
        setValor('')
        setSubconta('CAIXA')
        setMotivo('')
        setTransferenciaDestino('SWITCH')
    }

    /* ─── Adicionar movimentação ─── */
    function handleAdd() {
        const v = parseCurrency(valor)
        if (!motivo.trim() || !v || !conta) return

        if (tipo === 'TRANSFERENCIA') {
            const isCaixa = subconta === 'CAIXA'
            if (transferenciaDestino === 'SWITCH') {
                // Troca interna Caixa ↔ Aplicado
                setContasAll(prev => prev.map(c => {
                    if (c.id !== conta.id) return c
                    const pC = Number(c.valorCaixa) || 0
                    const pA = Number(c.valorAplicado) || 0
                    return { ...c, valorCaixa: isCaixa ? pC - v : pC + v, valorAplicado: isCaixa ? pA + v : pA - v }
                }))
            } else {
                // Transferência para outra conta (creditado em Em Caixa do destino)
                setContasAll(prev => prev.map(c => {
                    if (c.id === conta.id) {
                        const pC = Number(c.valorCaixa) || 0
                        const pA = Number(c.valorAplicado) || 0
                        return { ...c, valorCaixa: isCaixa ? pC - v : pC, valorAplicado: !isCaixa ? pA - v : pA }
                    }
                    if (c.id === transferenciaDestino) {
                        return { ...c, valorCaixa: (Number(c.valorCaixa) || 0) + v }
                    }
                    return c
                }))
            }
            setMovs(prev => [{
                id: uuid(), tipo: 'TRANSFERENCIA', subconta,
                motivo: motivo.trim(), valor: v,
                data: todayStr(), createdAt: new Date().toISOString(),
                transferenciaDestinoId: transferenciaDestino,
            }, ...prev])
            setOpen(false); reset(); return
        }

        // ENTRADA / SAIDA
        const isEntrada = tipo === 'ENTRADA'
        const isCaixa = subconta === 'CAIXA'
        setContasAll(prev => prev.map(c => {
            if (c.id !== conta.id) return c
            const pC = Number(c.valorCaixa) || 0
            const pA = Number(c.valorAplicado) || 0
            return { ...c, valorCaixa: isCaixa ? pC + (isEntrada ? v : -v) : pC, valorAplicado: !isCaixa ? pA + (isEntrada ? v : -v) : pA }
        }))
        setMovs(prev => [{
            id: uuid(), tipo, subconta,
            motivo: motivo.trim(), valor: v,
            data: todayStr(), createdAt: new Date().toISOString(),
        }, ...prev])
        setOpen(false); reset()
    }

    /* ─── Excluir movimentação (estorno) ─── */
    function handleDeleteMov(mov: MovimentacaoConta) {
        if (!conta) return
        if (mov.tipo === 'TRANSFERENCIA') {
            const isCaixa = mov.subconta === 'CAIXA'
            const destId = mov.transferenciaDestinoId
            setContasAll(prev => prev.map(c => {
                if (c.id === conta.id) {
                    const pC = Number(c.valorCaixa) || 0
                    const pA = Number(c.valorAplicado) || 0
                    if (destId === 'SWITCH' || !destId) {
                        return { ...c, valorCaixa: isCaixa ? pC + mov.valor : pC - mov.valor, valorAplicado: isCaixa ? pA - mov.valor : pA + mov.valor }
                    }
                    return { ...c, valorCaixa: isCaixa ? pC + mov.valor : pC, valorAplicado: !isCaixa ? pA + mov.valor : pA }
                }
                if (destId && destId !== 'SWITCH' && c.id === destId) {
                    return { ...c, valorCaixa: (Number(c.valorCaixa) || 0) - mov.valor }
                }
                return c
            }))
            setMovs(p => p.filter(m => m.id !== mov.id)); return
        }
        const isEntrada = mov.tipo === 'ENTRADA'
        const isCaixa = mov.subconta === 'CAIXA'
        setContasAll(prev => prev.map(c => {
            if (c.id !== conta.id) return c
            const pC = Number(c.valorCaixa) || 0
            const pA = Number(c.valorAplicado) || 0
            return { ...c, valorCaixa: isCaixa ? pC + (isEntrada ? -mov.valor : mov.valor) : pC, valorAplicado: !isCaixa ? pA + (isEntrada ? -mov.valor : mov.valor) : pA }
        }))
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
    const tipoCfg = TIPO_CFG[tipo]
    const TipoCfgIcon = tipoCfg.Icon

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
                    <span className="flex h-14 w-14 items-center justify-center rounded-[16px] flex-shrink-0" style={{ backgroundColor: accent.bg }}>
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
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Aplicações</p>
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
                        <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: '#8E8E9314' }}>
                                <Receipt className="h-7 w-7 text-muted-foreground/40" />
                            </span>
                            <p className="text-[17px] font-semibold">Sem movimentações</p>
                            <p className="text-[14px] text-muted-foreground mt-1.5 text-center max-w-[200px]">Registre entradas, saídas e transferências</p>
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
                                <motion.div key={group.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.28, delay: gi * 0.06 }}>
                                    <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                                        {group.label}
                                    </p>
                                    <div className="rounded-[24px] bg-card/60 backdrop-blur-md border border-border/40 shadow-sm overflow-hidden mb-6">
                                        <AnimatePresence initial={false}>
                                            {group.items.map((mov, i) => {
                                                const isT = mov.tipo === 'TRANSFERENCIA'
                                                const isE = mov.tipo === 'ENTRADA'
                                                const tint = isT ? '#007AFF' : isE ? '#34C759' : '#FF3B30'
                                                const typeLbl = isT ? 'Transferência' : isE ? 'Entrada' : 'Saída'
                                                const MovIcon = isT ? ArrowLeftRight : isE ? ArrowDownRight : ArrowUpRight
                                                const sc = mov.subconta ?? 'CAIXA'
                                                const scLbl = SUBCONTA_LABEL[sc]

                                                const subInfo = isT
                                                    ? (() => {
                                                        if (mov.transferenciaDestinoId === 'SWITCH' || !mov.transferenciaDestinoId) {
                                                            return `${scLbl} → ${sc === 'CAIXA' ? 'Aplicações' : 'Em Caixa'}`
                                                        }
                                                        const dest = contasAll.find(c => c.id === mov.transferenciaDestinoId)
                                                        return `→ ${dest?.banco ?? 'Outra conta'}`
                                                    })()
                                                    : scLbl

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
                                                            <MovIcon className="h-5 w-5" style={{ color: tint }} />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[16px] md:text-[17px] font-semibold tracking-tight leading-snug break-words">
                                                                {mov.motivo}
                                                            </p>
                                                            <p className="text-[13px] font-medium text-muted-foreground mt-0.5 opacity-80">
                                                                {typeLbl}
                                                                {subInfo && <><span className="mx-1.5 text-border/50">·</span>{subInfo}</>}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                                                            <div className="text-right">
                                                                <p className="text-[17px] font-bold tracking-tight tabular-nums"
                                                                    style={{ color: isT ? '#007AFF' : isE ? '#34C759' : undefined }}>
                                                                    {!isT && (isE ? '+' : '−')}{formatCurrency(mov.valor)}
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

            {/* ══════════════════════════════════
                MODAL — NOVA MOVIMENTAÇÃO
            ══════════════════════════════════ */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
                <DialogContent className="p-0 sm:max-w-[440px] sm:rounded-[28px] border-white/10 bg-background/95 backdrop-blur-2xl dark:bg-zinc-900/90">

                    {/* ── Header ── */}
                    <DialogHeader className="px-5 sm:px-6 pt-6 pb-5 relative border-b border-border/10">
                        <motion.button whileTap={{ scale: 0.9 }}
                            onClick={() => { setOpen(false); reset() }}
                            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors z-10">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </motion.button>
                        <div className="flex items-center gap-3.5">
                            <AnimatePresence mode="wait">
                                <motion.span key={tipo}
                                    initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.7, opacity: 0 }}
                                    transition={{ type: 'spring', bounce: 0.3, duration: 0.32 }}
                                    className="flex h-12 w-12 items-center justify-center rounded-[16px] flex-shrink-0"
                                    style={{ backgroundColor: tipoCfg.iconBg }}>
                                    <TipoCfgIcon className="h-6 w-6" style={{ color: tipoCfg.color }} />
                                </motion.span>
                            </AnimatePresence>
                            <div>
                                <DialogTitle className="text-[20px] sm:text-[21px] font-bold tracking-tight leading-none">
                                    Nova Movimentação
                                </DialogTitle>
                                <p className="text-[13px] text-muted-foreground mt-1">{conta.banco}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* ── Form ── */}
                    <div className="px-5 sm:px-6 pt-5 pb-3 space-y-5">

                        {/* 1 — Tipo (3 opções — igual obras) */}
                        <div className="space-y-2">
                            <Label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-0.5">
                                Tipo de Operação
                            </Label>
                            <div className="flex gap-1 p-1 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.05]">
                                {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as TipoMov[]).map(t => {
                                    const cfg = TIPO_CFG[t]
                                    const active = tipo === t
                                    const CfgIcon = cfg.Icon
                                    return (
                                        <motion.button key={t} type="button" whileTap={{ scale: 0.95 }}
                                            onClick={() => setTipo(t)}
                                            className={cn(
                                                'relative flex-1 flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors z-10',
                                                active ? '' : 'text-muted-foreground hover:text-foreground/70',
                                            )}
                                            style={{ color: active ? cfg.color : undefined }}>
                                            {active && (
                                                <motion.div layoutId="tipo-pill-3"
                                                    className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-black/[0.06] dark:border-white/[0.06] -z-10"
                                                    transition={{ type: 'spring', bounce: 0.15, duration: 0.38 }} />
                                            )}
                                            <CfgIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span>{cfg.label}</span>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 2 — Conta / Transferência (condicional) */}
                        <AnimatePresence mode="wait">
                            {tipo !== 'TRANSFERENCIA' ? (
                                <motion.div key="conta-normal"
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}
                                    className="space-y-2">
                                    <Label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-0.5">
                                        {tipo === 'ENTRADA' ? 'Conta de Destino' : 'Conta de Origem'}
                                    </Label>
                                    <div className="flex gap-1 p-1 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.05]">
                                        <SegBtn active={subconta === 'CAIXA'} color="#34C759" onClick={() => setSubconta('CAIXA')} layoutId="sc-bg">
                                            <Wallet className="h-3.5 w-3.5" /><span>Em Caixa</span>
                                        </SegBtn>
                                        <SegBtn active={subconta === 'APLICADO'} color="#007AFF" onClick={() => setSubconta('APLICADO')} layoutId="sc-bg">
                                            <FileText className="h-3.5 w-3.5" /><span>Aplicações</span>
                                        </SegBtn>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="transf-section"
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}
                                    className="space-y-4">

                                    {/* De — DestinoCard com saldo visível */}
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-0.5">De</Label>
                                        <div className="space-y-1.5">
                                            <DestinoCard
                                                selected={subconta === 'CAIXA'}
                                                onSelect={() => setSubconta('CAIXA')}
                                                icon={Wallet}
                                                color="#34C759"
                                                iconBg="#34C75914"
                                                title="Em Caixa"
                                                subtitle={`Disponível · ${formatCurrency(Number(conta.valorCaixa) || 0)}`}
                                            />
                                            <DestinoCard
                                                selected={subconta === 'APLICADO'}
                                                onSelect={() => setSubconta('APLICADO')}
                                                icon={FileText}
                                                color="#007AFF"
                                                iconBg="#007AFF14"
                                                title="Aplicações"
                                                subtitle={`Disponível · ${formatCurrency(Number(conta.valorAplicado) || 0)}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Para */}
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-0.5">Para</Label>
                                        <div className="space-y-1.5">
                                            {/* Troca interna → outra subconta da mesma conta */}
                                            <DestinoCard
                                                selected={transferenciaDestino === 'SWITCH'}
                                                onSelect={() => setTransferenciaDestino('SWITCH')}
                                                icon={subconta === 'CAIXA' ? FileText : Wallet}
                                                color={subconta === 'CAIXA' ? '#007AFF' : '#34C759'}
                                                iconBg={subconta === 'CAIXA' ? '#007AFF14' : '#34C75914'}
                                                title={subconta === 'CAIXA' ? 'Aplicações' : 'Em Caixa'}
                                                subtitle={`Saldo atual · ${formatCurrency(
                                                    subconta === 'CAIXA'
                                                        ? (Number(conta.valorAplicado) || 0)
                                                        : (Number(conta.valorCaixa) || 0)
                                                )}`}
                                            />
                                            {/* Outras contas */}
                                            {outrasContas.map(c => (
                                                <DestinoCard
                                                    key={c.id}
                                                    selected={transferenciaDestino === c.id}
                                                    onSelect={() => setTransferenciaDestino(c.id)}
                                                    icon={Landmark}
                                                    color="#AF52DE"
                                                    iconBg="#AF52DE14"
                                                    title={c.banco}
                                                    subtitle={`Em Caixa · ${formatCurrency(Number(c.valorCaixa) || 0)}`}
                                                />
                                            ))}
                                            {outrasContas.length === 0 && (
                                                <p className="text-[12px] text-muted-foreground text-center py-2 opacity-60">
                                                    Cadastre outras contas para transferir entre elas
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 3 — Valor (acima de Descrição) */}
                        <div className="space-y-2">
                            <Label className="text-[11px] font-semibold uppercase tracking-widest pl-0.5"
                                style={{ color: tipoCfg.color }}>
                                Valor da Operação
                            </Label>
                            <CurrencyInput
                                placeholder="0,00"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                className="h-[54px] rounded-2xl text-[18px] font-bold bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06] shadow-sm focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
                            />
                        </div>

                        {/* 4 — Descrição */}
                        <div className="space-y-2">
                            <Label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest pl-0.5">
                                Descrição
                            </Label>
                            <Input
                                placeholder={
                                    tipo === 'ENTRADA' ? 'Ex: Depósito, Receita…'
                                    : tipo === 'SAIDA' ? 'Ex: Pagamento, Despesa…'
                                    : 'Ex: Reserva, Aplicação…'
                                }
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                className="h-[54px] rounded-2xl text-[16px] px-4 font-medium bg-background/50 border-black/10 dark:border-white/10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
                            />
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex gap-2.5 px-5 sm:px-6 pb-8 sm:pb-6 pt-4">
                        <Button variant="outline"
                            className="flex-1 h-[54px] rounded-[18px] text-[15px] font-semibold bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            onClick={() => { setOpen(false); reset() }}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-[54px] rounded-[18px] text-[15px] font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
                            disabled={!motivo.trim() || !parseCurrency(valor)}
                            onClick={handleAdd}
                            style={{
                                backgroundColor: motivo.trim() && parseCurrency(valor) ? tipoCfg.color : '#8E8E93',
                            }}>
                            {tipoCfg.btnLabel}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
