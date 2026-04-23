import { EmptyState } from '@/components/ui/empty-state'
import { useDashboardCustoPorObra } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, BarChart2, Building2, DollarSign, RotateCcw, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartTip,
  GlassCard,
  LoadingGrid,
  MetricCard,
  RadialProgress,
  SectionHeader,
  SparkBar,
  containerVariants,
  ringColor,
  rowVariants,
  statusMap,
} from './analises-primitives'

export function OrcamentoTab() {
  const qc = useQueryClient()
  const { data: custoPorObra, isLoading, error } = useDashboardCustoPorObra()

  const totals = useMemo(() => {
    if (!custoPorObra) return null
    const orcamento = custoPorObra.reduce((s, o) => s + (o.orcamento || 0), 0)
    const custo = custoPorObra.reduce((s, o) => s + (o.custo || 0), 0)
    const saldo = orcamento - custo
    const pct = orcamento > 0 ? Math.round((custo / orcamento) * 100) : 0
    const obrasAcima = custoPorObra.filter((o) => (o.custo || 0) > (o.orcamento || 0)).length
    return { orcamento, custo, saldo, pct, obrasAcima }
  }, [custoPorObra])

  const chartData = useMemo(() => {
    if (!custoPorObra) return []
    return custoPorObra.slice(0, 8).map((o) => ({
      name: o.obra.split(' ').slice(0, 2).join(' '),
      custo: o.custo || 0,
      orcamento: o.orcamento || 0,
    }))
  }, [custoPorObra])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-[15px] font-semibold">Erro ao carregar dados</h3>
          <p className="text-[13px] text-muted-foreground mt-1">
            Verifique sua conexão e tente novamente
          </p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })}
          className="flex items-center gap-2 h-10 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white active:scale-[0.97] hover:bg-primary/90 transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 pb-6 space-y-5">
        <LoadingGrid cols={4} rows={1} cardHeight={88} />
        <LoadingGrid cols={1} rows={3} cardHeight={80} />
      </div>
    )
  }

  if (!custoPorObra || custoPorObra.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <EmptyState
          icon={BarChart2}
          title="Nenhuma obra encontrada"
          description="Crie uma obra para visualizar análises de orçamento"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 md:px-6 pb-8">
      {/* KPI grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <MetricCard
          label="Orçamento Total"
          value={totals?.orcamento ?? 0}
          formatter="currency"
          accent="#007AFF"
          icon={<Wallet className="h-3.5 w-3.5" />}
          delay={0}
        />
        <MetricCard
          label="Custo Total"
          value={totals?.custo ?? 0}
          formatter="currency"
          accent="#FF9500"
          icon={<DollarSign className="h-3.5 w-3.5" />}
          delay={0.05}
        />
        <MetricCard
          label="Saldo Disponível"
          value={Math.abs(totals?.saldo ?? 0)}
          formatter="currency"
          accent={(totals?.saldo ?? 0) >= 0 ? '#34C759' : '#FF3B30'}
          description={(totals?.saldo ?? 0) < 0 ? 'Orçamento excedido' : 'Dentro do orçamento'}
          delay={0.1}
        />
        <MetricCard
          label="% Gasto"
          value={totals?.pct ?? 0}
          formatter="percent"
          accent={ringColor(totals?.pct ?? 0)}
          icon={<Building2 className="h-3.5 w-3.5" />}
          description={`${totals?.obrasAcima ?? 0} obra${(totals?.obrasAcima ?? 0) !== 1 ? 's' : ''} acima do orçamento`}
          delay={0.15}
        />
      </motion.div>

      {/* Bar chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <GlassCard className="p-5">
            <SectionHeader title="Custo vs Orçamento por Obra" className="mb-4" />
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chartData} barGap={3} barSize={14}>
                <defs>
                  <linearGradient id="gradOrc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(142,142,147,0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={<ChartTip />}
                  cursor={{ fill: 'rgba(0,122,255,0.06)', radius: 6 }}
                />
                <Bar
                  dataKey="orcamento"
                  fill="url(#gradOrc)"
                  radius={[6, 6, 0, 0]}
                  name="Orçamento"
                />
                <Bar dataKey="custo" radius={[6, 6, 0, 0]} name="Custo">
                  {chartData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={entry.custo > entry.orcamento ? '#FF3B30' : '#FF9500'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Azul = orçamento · Laranja = gasto · Vermelho = excedido
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Project cards */}
      <div>
        <SectionHeader
          title="Obras"
          description={`${custoPorObra.length} projeto${custoPorObra.length !== 1 ? 's' : ''}`}
          className="mb-3"
        />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2.5"
        >
          {custoPorObra.map((row, idx) => {
            const info = statusMap[row.status] ?? {
              label: row.status,
              color: '#8E8E93',
              bgColor: '#8E8E9318',
            }
            const saldo = (row.orcamento || 0) - (row.custo || 0)
            const isOver = saldo < 0
            return (
              <motion.div key={row.id} variants={rowVariants}>
                <GlassCard className="p-4">
                  {/* Mobile */}
                  <div className="flex items-start gap-3 md:hidden">
                    <RadialProgress
                      value={row.percentual}
                      size={44}
                      strokeWidth={4}
                      delay={0.15 + idx * 0.03}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-[14px] truncate">{row.obra}</p>
                        <span
                          className="inline-flex px-2 py-0.5 rounded-lg text-[11px] font-semibold flex-shrink-0"
                          style={{ backgroundColor: info.bgColor, color: info.color }}
                        >
                          {info.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate mb-2.5">
                        {row.endereco}
                      </p>
                      <div className="grid grid-cols-3 gap-2 mb-2.5">
                        {[
                          {
                            label: 'Orçamento',
                            val: formatCurrency(row.orcamento || 0),
                            color: undefined,
                          },
                          { label: 'Gasto', val: formatCurrency(row.custo || 0), color: undefined },
                          {
                            label: 'Saldo',
                            val: (isOver ? '−' : '+') + formatCurrency(Math.abs(saldo)),
                            color: isOver ? '#FF3B30' : '#34C759',
                          },
                        ].map(({ label, val, color }) => (
                          <div key={label}>
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p
                              className="text-[12px] font-semibold tabular-nums"
                              style={color ? { color } : undefined}
                            >
                              {val}
                            </p>
                          </div>
                        ))}
                      </div>
                      <SparkBar
                        value={row.percentual}
                        color={ringColor(row.percentual)}
                        delay={0.2 + idx * 0.03}
                      />
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:flex items-center gap-4">
                    <RadialProgress
                      value={row.percentual}
                      size={48}
                      strokeWidth={4.5}
                      delay={0.15 + idx * 0.025}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-[14px] truncate">{row.obra}</p>
                        <span
                          className="inline-flex px-2 py-0.5 rounded-lg text-[11px] font-semibold"
                          style={{ backgroundColor: info.bgColor, color: info.color }}
                        >
                          {info.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground truncate">{row.endereco}</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      {[
                        {
                          label: 'Orçamento',
                          val: formatCurrency(row.orcamento || 0),
                          color: undefined,
                        },
                        { label: 'Gasto', val: formatCurrency(row.custo || 0), color: undefined },
                        {
                          label: 'Saldo',
                          val: (isOver ? '−' : '+') + formatCurrency(Math.abs(saldo)),
                          color: isOver ? '#FF3B30' : '#34C759',
                        },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="text-right">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p
                            className="text-[13px] font-semibold tabular-nums"
                            style={color ? { color } : undefined}
                          >
                            {val}
                          </p>
                        </div>
                      ))}
                      <div className="text-right min-w-[64px]">
                        <p className="text-[10px] text-muted-foreground mb-1">% Gasto</p>
                        <p
                          className="text-[13px] font-bold tabular-nums"
                          style={{ color: ringColor(row.percentual) }}
                        >
                          {formatNumber(row.percentual)}%
                        </p>
                        <SparkBar
                          value={row.percentual}
                          color={ringColor(row.percentual)}
                          delay={0.2 + idx * 0.025}
                          className="w-16 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
