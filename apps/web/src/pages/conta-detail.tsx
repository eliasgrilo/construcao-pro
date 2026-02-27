import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Landmark, CreditCard, Wallet, FileText,
    ArrowDownRight, ArrowUpRight, Plus, Trash2, Receipt,
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
    active, color, onClick, children,
}: {
    active: boolean; color: string; onClick: () => void; children: React.ReactNode
}) {
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            className={cn(
                'flex items-center justify-center gap-1.5 rounded-[10px] text-[15px] font-medium transition-all min-h-[46px]',
                active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            style={{ color: active ? color : undefined }}
        >
            {children}
        </motion.button>
    )
}

/* ══════════════════════════════ */
export function ContaDetailPage() {
    const { contaId } = useParams({ strict: false }) as { contaId: string }
    const navigate = useNavigate()

    const conta = useMemo(() => loadContas().find(c => c.id === contaId), [contaId])
    const accentIdx = useMemo(() => {
        if (!conta) return 0
        return loadContas().findIndex(c => c.id === contaId) % accents.length
    }, [conta, contaId])
    const accent = accents[accentIdx]

    const [movs, setMovs] = useState<MovimentacaoConta[]>(() => loadMovs(contaId))
    useEffect(() => { saveMovs(contaId, movs) }, [contaId, movs])

    const baseTotal  = (conta?.valorCaixa ?? 0) + (conta?.valorAplicado ?? 0)
    const saldoAtual = baseTotal   // caixa + aplicado
    const caixaPct   = baseTotal > 0 ? Math.round(((conta?.valorCaixa ?? 0) / baseTotal) * 100) : 0

    const grouped = useMemo(() => {
        const sorted = [...movs].sort((a, b) =>
            b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt)
        )
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
    const [tipo,     setTipo]     = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
    const [valor,    setValor]    = useState('')
    const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')
    const [motivo,   setMotivo]   = useState('')

    function reset() { setTipo('ENTRADA'); setValor(''); setSubconta('CAIXA'); setMotivo('') }

    function handleAdd() {
        const v = parseCurrency(valor)
        if (!motivo.trim() || !v) return
        setMovs(prev => [{
            id: crypto.randomUUID(), tipo, subconta,
            motivo: motivo.trim(), valor: v,
            data: todayStr(), createdAt: new Date().toISOString(),
        }, ...prev])
        setOpen(false)
        reset()
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
                    <div className="flex gap-4 mt-5 pt-5 border-t border-border/20">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: '#34C75914' }}>
                                    <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
                                </span>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Em caixa</p>
                            </div>
                            <p className="text-[18px] font-bold tabular-nums" style={{ color: '#34C759' }}>{formatCurrency(conta.valorCaixa)}</p>
                        </div>
                        <div className="w-px bg-border/30" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: '#007AFF14' }}>
                                    <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
                                </span>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Aplicado</p>
                            </div>
                            <p className="text-[18px] font-bold tabular-nums" style={{ color: '#007AFF' }}>{formatCurrency(conta.valorAplicado)}</p>
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
                                    <div className="rounded-2xl bg-card border overflow-hidden divide-y divide-border/10">
                                        <AnimatePresence initial={false}>
                                            {group.items.map((mov) => {
                                                const isE    = mov.tipo === 'ENTRADA'
                                                const tint   = isE ? '#34C759' : '#FF3B30'
                                                const Icon   = isE ? ArrowDownRight : ArrowUpRight
                                                const sc     = mov.subconta ?? 'CAIXA'
                                                const scClr  = sc === 'CAIXA' ? '#34C759' : '#007AFF'
                                                const scLbl  = sc === 'CAIXA' ? 'Caixa' : 'Aplicado'
                                                return (
                                                    <motion.div key={mov.id} layout
                                                        exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                                                        className="flex items-center gap-3 px-4 py-3.5 group">
                                                        <div className="w-[3px] self-stretch rounded-full flex-shrink-0 my-1"
                                                            style={{ backgroundColor: tint }} />
                                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                                                            style={{ backgroundColor: `${tint}14` }}>
                                                            <Icon className="h-4 w-4" style={{ color: tint }} />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[15px] font-medium leading-snug">{mov.motivo}</p>
                                                                <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                                                    style={{ backgroundColor: `${scClr}18`, color: scClr }}>
                                                                    {scLbl}
                                                                </span>
                                                            </div>
                                                            <p className="text-[12px] text-muted-foreground mt-0.5 tabular-nums">
                                                                {formatDateTime(mov.createdAt)}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <p className="text-[15px] font-semibold tabular-nums" style={{ color: tint }}>
                                                                {isE ? '+' : '−'}{formatCurrency(mov.valor)}
                                                            </p>
                                                            <motion.button whileTap={{ scale: 0.88 }}
                                                                onClick={() => setMovs(p => p.filter(m => m.id !== mov.id))}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                                style={{ backgroundColor: '#FF3B3010' }}>
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

            {/* ══════ MODAL ══════ */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
                <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-[440px] rounded-2xl p-0 gap-0 overflow-hidden">

                    {/* Header */}
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                                style={{ backgroundColor: tipo === 'ENTRADA' ? '#34C75914' : '#FF3B3014' }}>
                                {tipo === 'ENTRADA'
                                    ? <ArrowDownRight className="h-5 w-5" style={{ color: '#34C759' }} />
                                    : <ArrowUpRight   className="h-5 w-5" style={{ color: '#FF3B30' }} />}
                            </span>
                            <DialogTitle className="text-[18px] font-semibold tracking-tight">Nova Movimentação</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-5 space-y-5">

                        {/* 1 — Tipo */}
                        <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-foreground">Tipo</Label>
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/40">
                                <SegBtn active={tipo === 'ENTRADA'} color="#34C759" onClick={() => setTipo('ENTRADA')}>
                                    <ArrowDownRight className="h-4 w-4" />Entrada
                                </SegBtn>
                                <SegBtn active={tipo === 'SAIDA'} color="#FF3B30" onClick={() => setTipo('SAIDA')}>
                                    <ArrowUpRight className="h-4 w-4" />Saída
                                </SegBtn>
                            </div>
                        </div>

                        {/* 2 — Valor */}
                        <div className="space-y-2">
                            <Label className="text-[13px] font-medium"
                                style={{ color: tipo === 'ENTRADA' ? '#34C759' : '#FF3B30' }}>
                                Valor
                            </Label>
                            <CurrencyInput
                                placeholder="0,00"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                autoFocus
                                className="h-12 sm:h-11 rounded-xl"
                            />
                        </div>

                        {/* 3 — Conta (Em Caixa / Aplicado) */}
                        <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-foreground">Conta</Label>
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/40">
                                <SegBtn active={subconta === 'CAIXA'} color="#34C759" onClick={() => setSubconta('CAIXA')}>
                                    <Wallet className="h-4 w-4" />Em Caixa
                                </SegBtn>
                                <SegBtn active={subconta === 'APLICADO'} color="#007AFF" onClick={() => setSubconta('APLICADO')}>
                                    <FileText className="h-4 w-4" />Aplicado
                                </SegBtn>
                            </div>
                        </div>

                        {/* 4 — Motivo */}
                        <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-foreground">Motivo</Label>
                            <Input
                                placeholder={tipo === 'ENTRADA' ? 'Ex: Depósito, Transferência recebida…' : 'Ex: Pagamento fornecedor, Compra…'}
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                className="h-12 sm:h-11 rounded-xl text-[16px] sm:text-[15px] placeholder:text-muted-foreground/40"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 pb-6">
                        <Button variant="outline" className="flex-1 h-12 sm:h-11 rounded-xl text-[15px] font-medium"
                            onClick={() => { setOpen(false); reset() }}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-12 sm:h-11 rounded-xl text-[15px] font-medium"
                            disabled={!motivo.trim() || !parseCurrency(valor)}
                            onClick={handleAdd}
                            style={{
                                backgroundColor: motivo.trim() && parseCurrency(valor)
                                    ? (tipo === 'ENTRADA' ? '#34C759' : '#FF3B30')
                                    : undefined,
                            }}>
                            Registrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
