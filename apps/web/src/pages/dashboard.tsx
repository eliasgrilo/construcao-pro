import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
    ArrowDownRight, ArrowUpRight, ArrowLeftRight,
    AlertTriangle, ChevronRight, MapPin, Landmark, Package, CheckCircle2, FileText, Building2,
} from 'lucide-react'
import { useDashboardStats, useDashboardCustoPorObra, useMovimentacoesRecentes, useEstoqueAlertas, useObras } from '@/hooks/use-supabase'
import { cn, formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

/* Apple System Colors */
const clr = { blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500' }

function greeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

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

const statusMap: Record<string, { label: string; color: string }> = {
    ATIVA: { label: 'Ativa', color: '#34C759' },
    PAUSADA: { label: 'Pausada', color: '#FF9500' },
    FINALIZADA: { label: 'Finalizada', color: '#8E8E93' },
    VENDIDO: { label: 'Vendido', color: '#5856D6' },
    TERRENO: { label: 'Terreno', color: '#AF52DE' },
}

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

export function DashboardPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const { data: stats } = useDashboardStats()
    const { data: recentMovs } = useMovimentacoesRecentes()
    const { data: custoPorObra } = useDashboardCustoPorObra()
    const { data: alertasData } = useEstoqueAlertas()
    const { data: obrasData } = useObras()

    const s = stats
    const movs = recentMovs || []
    const obras = (custoPorObra || []).filter((o: any) => o.status === 'ATIVA')
    const alertas = alertasData || []
    const pct = s?.orcamentoTotal && s.orcamentoTotal > 0 ? Math.round((s.custoTotal / s.orcamentoTotal) * 100) : 0

    /* Terrenos em Standby */
    const terrenosStandby = (obrasData || []).filter((o: any) => o.status === 'TERRENO')
    const totalTerrenos = terrenosStandby.reduce((sum: number, o: any) => sum + (o.valor_terreno ?? 0), 0)

    return (
        <div className="pb-16">

            {/* ─── Large Title ─── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="px-4 md:px-6 pt-10 pb-8">
                <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight leading-tight">
                    {greeting()}, {user?.nome?.split(' ')[0] ?? 'usuário'}.
                </h1>
                <p className="text-[15px] md:text-[17px] text-muted-foreground mt-1">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </motion.div>

            {/* ─── Financial Summary ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-6 px-4 md:px-6"
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

            {/* ─── Suas Obras ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-10 px-4 md:px-6"
            >
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Obras Ativas</h2>
                    <button onClick={() => navigate({ to: '/obras' })} className="text-[15px] md:text-[17px] text-primary font-regular flex items-center hover:text-primary/80 transition-colors">
                        Ver Todas<ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                </div>

                {obras.length === 0 ? (
                    <p className="text-[17px] text-muted-foreground text-center py-10">Nenhuma obra ativa no momento.</p>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                    >
                        {obras.map((obra: any) => {
                            const op = obra.percentual ?? 0
                            const st = statusMap[obra.status] ?? statusMap.ATIVA
                            return (
                                <motion.button
                                    key={obra.id}
                                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                                    onClick={() => navigate({ to: '/obras/$obraId', params: { obraId: obra.id } })}
                                    className="apple-card flex flex-col p-5 text-left cursor-pointer"
                                >
                                    {/* Header: Status + Badge */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-[9px] w-[9px] rounded-full" style={{ backgroundColor: st.color }} />
                                            <span className="text-[13px] font-medium" style={{ color: st.color }}>{st.label}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                                    </div>

                                    {/* Nome */}
                                    <h3 className="text-[17px] font-semibold leading-snug">{obra.obra}</h3>

                                    {/* Endereço */}
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                                        <span className="text-[13px] text-muted-foreground leading-snug truncate">{obra.endereco}</span>
                                    </div>

                                    {/* Investimento */}
                                    <div className="mt-2.5 space-y-1.5">
                                        {[
                                            { label: 'Terreno', Icon: Landmark, color: '#AF52DE', value: obra.valor_terreno ?? 0, valueColor: (obra.valor_terreno ?? 0) > 0 ? '#AF52DE' : undefined },
                                            { label: 'Burocracia', Icon: FileText, color: '#007AFF', value: obra.valor_burocracia ?? 0, valueColor: (obra.valor_burocracia ?? 0) > 0 ? '#007AFF' : undefined },
                                            { label: 'Construção', Icon: Building2, color: '#FF9500', value: obra.valor_construcao ?? 0, valueColor: (obra.valor_construcao ?? 0) > 0 ? '#FF9500' : undefined },
                                        ].map(({ label, Icon, color, value, valueColor }) => (
                                            <div key={label} className="flex items-center gap-1.5">
                                                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                                                    <Icon className="h-3 w-3" style={{ color }} />
                                                </span>
                                                <span className="text-[12px] text-muted-foreground">{label}</span>
                                                <span className="text-[12px] font-semibold tabular-nums ml-auto" style={{ color: valueColor }}>
                                                    {formatCurrency(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Spacer to push footer down */}
                                    <div className="flex-1 min-h-4" />

                                    {/* Budget progress bar */}
                                    <div className="mt-4 pt-4 border-t border-border/15">
                                        <div className="flex items-baseline justify-between mb-2.5">
                                            <span className="text-[15px] font-semibold tabular-nums">{formatCurrency(obra.custo)}</span>
                                            <span className="text-[12px] text-muted-foreground tabular-nums">de {formatCurrency(obra.orcamento)}</span>
                                        </div>
                                        <div className="h-[5px] w-full rounded-full bg-muted/50 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${Math.min(op, 100)}%`,
                                                    backgroundColor: ringColor(op),
                                                }}
                                            />
                                        </div>
                                        <p className="text-[12px] text-muted-foreground mt-1.5 tabular-nums">{op}% do orçamento utilizado</p>
                                    </div>
                                </motion.button>
                            )
                        })}
                    </motion.div>
                )}
            </motion.div>

            {/* ─── Insights row ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="px-4 md:px-6 mt-10 grid grid-cols-2 gap-3 md:gap-4"
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

            {/* ─── Alertas de Estoque (lista detalhada, sempre visível) ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="px-4 md:px-6 mt-4"
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

                    {/* Empty state */}
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

                    {/* Items list */}
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
                                {/* Icon */}
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                                    style={{ backgroundColor: `${accentColor}14` }}>
                                    <Package className="h-4 w-4" style={{ color: accentColor }} />
                                </span>

                                {/* Info */}
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
                                    {/* Mini progress bar */}
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
                transition={{ duration: 0.4, delay: 0.4 }}
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
        </div>
    )
}
