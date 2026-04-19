import { EmptyState } from '@/components/ui/empty-state'
import { useMaterialCostTrend } from '@/hooks/use-supabase'
import { formatCurrency } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart2, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
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
  AreaGradient,
  ChartTip,
  GlassCard,
  LoadingGrid,
  MetricCard,
  SectionHeader,
  containerVariants,
} from './analises-primitives'

export function TendenciaTab({ isActive }: { isActive: boolean }) {
  const qc = useQueryClient()
  const { data: trend, isLoading, error } = useMaterialCostTrend({ enabled: isActive })

  const stats = useMemo(() => {
    if (!trend || trend.length === 0) return null
    const total = trend.reduce((s, t) => s + t.total, 0)
    const avg = total / trend.length
    const ultimo = trend[trend.length - 1]
    const penultimo = trend.length >= 2 ? trend[trend.length - 2] : null
    const deltaPct =
      penultimo && penultimo.total > 0
        ? ((ultimo.total - penultimo.total) / penultimo.total) * 100
        : null
    const maxTotal = Math.max(...trend.map((t) => t.total))
    return { total, avg, deltaPct, maxTotal }
  }, [trend])

  const chartData = useMemo(
    () => trend?.map((t) => ({ name: t.label, total: Math.round(t.total * 100) / 100 })) ?? [],
    [trend],
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-[15px] font-semibold">Erro ao carregar tendência</h3>
          <p className="text-[13px] text-muted-foreground mt-1">
            Verifique sua conexão e tente novamente
          </p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ['estoque', 'cost-trend'] })}
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
        <LoadingGrid cols={3} rows={1} cardHeight={88} />
        <LoadingGrid cols={1} rows={1} cardHeight={240} />
        <LoadingGrid cols={1} rows={1} cardHeight={180} />
      </div>
    )
  }

  if (!trend || trend.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <EmptyState
          icon={BarChart2}
          title="Sem dados de tendência"
          description="Registre entradas de materiais nos últimos 6 meses para ver a tendência de custos"
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
        className="grid grid-cols-3 gap-3"
      >
        <MetricCard
          label="Total 6 meses"
          value={stats?.total ?? 0}
          formatter="currency"
          accent="#007AFF"
          delay={0}
        />
        <MetricCard
          label="Média mensal"
          value={stats?.avg ?? 0}
          formatter="currency"
          accent="#FF9500"
          delay={0.05}
        />
        <MetricCard
          label="Vs mês anterior"
          value={Math.abs(stats?.deltaPct ?? 0)}
          formatter="percent"
          accent={
            stats?.deltaPct == null
              ? '#8E8E93'
              : stats.deltaPct > 0
                ? '#FF3B30'
                : '#34C759'
          }
          delta={stats?.deltaPct ?? undefined}
          deltaInverted
          delay={0.1}
        />
      </motion.div>

      {/* Bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <GlassCard className="p-5">
          <SectionHeader title="Gastos mensais com materiais" className="mb-4" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={28} barGap={4}>
              <defs>
                <linearGradient id="gradTendencia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007AFF" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#007AFF" stopOpacity={0.5} />
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
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, idx) => {
                  const isLast = idx === chartData.length - 1
                  const isMax = stats && entry.total === stats.maxTotal
                  return (
                    <Cell
                      key={entry.name}
                      fill={
                        isLast
                          ? 'url(#gradTendencia)'
                          : isMax
                            ? '#FF3B30'
                            : 'rgba(0,122,255,0.3)'
                      }
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Azul = mês atual · Vermelho = maior gasto histórico
          </p>
        </GlassCard>
      </motion.div>

      {/* Area chart — evolution */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <GlassCard className="p-5">
          <SectionHeader title="Evolução de custos" className="mb-4" />
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <AreaGradient id="gradArea" color="#007AFF" />
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
              <Tooltip content={<ChartTip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#007AFF"
                strokeWidth={2.5}
                fill="url(#gradArea)"
                dot={{ fill: '#007AFF', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#007AFF', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>

      {/* Monthly breakdown */}
      <div>
        <SectionHeader
          title="Detalhamento mensal"
          description={`${trend.length} período${trend.length !== 1 ? 's' : ''}`}
          className="mb-3"
        />
        <div className="flex flex-col gap-2">
          {[...trend].reverse().map((t, idx) => {
            const isLast = idx === 0
            const pct = stats && stats.maxTotal > 0 ? (t.total / stats.maxTotal) * 100 : 0
            const barColor = isLast
              ? '#007AFF'
              : t.total === stats?.maxTotal
                ? '#FF3B30'
                : '#FF9500'
            return (
              <GlassCard key={t.month ?? t.label} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 text-right min-w-[56px]">
                    <p className="text-[12px] font-medium">{t.label}</p>
                    {isLast && (
                      <span className="text-[10px] font-semibold" style={{ color: '#007AFF' }}>
                        atual
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-[5px] rounded-full bg-muted/25 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.9,
                          delay: 0.05 + idx * 0.04,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right min-w-[96px]">
                    <p className="text-[13px] font-semibold tabular-nums">
                      {formatCurrency(t.total)}
                    </p>
                    {t.count != null && (
                      <p className="text-[10px] text-muted-foreground">{t.count} entr.</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
