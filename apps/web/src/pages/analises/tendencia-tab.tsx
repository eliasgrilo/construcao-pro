import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDashboardCustoPorObra,
  useMateriais,
  useMaterialCostTrend,
  useMaterialEntradas,
  useSupplierPriceRanking,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  Package,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  ATIVA: { label: 'Ativa', color: '#34C759', bgColor: '#34C75918' },
  FINALIZADA: { label: 'Finalizada', color: '#8E8E93', bgColor: '#8E8E9318' },
  PAUSADA: { label: 'Pausada', color: '#FF9500', bgColor: '#FF950018' },
  VENDIDO: { label: 'Vendido', color: '#5856D6', bgColor: '#5856D618' },
  TERRENO: { label: 'Terreno', color: '#AF52DE', bgColor: '#AF52DE18' },
  MANUTENCAO: { label: 'Manutenção', color: '#FF9500', bgColor: '#FF950018' },
}

function ringColor(pct: number) {
  return pct > 90 ? '#FF3B30' : pct > 70 ? '#FF9500' : '#34C759'
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} as const

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 },
  },
} as const

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface ChartTipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function ChartTip({ active, payload, label }: ChartTipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-[12px] font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-[14px] font-bold tabular-nums">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

// ─── Tab: Orçamento por Obra ─────────────────────────────────────────────────

export function TendenciaTab({ isActive }: { isActive: boolean }) {
  const { data: trend, isLoading, error } = useMaterialCostTrend({ enabled: isActive })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Erro ao carregar tendência</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
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

  const totalGasto = trend.reduce((sum, t) => sum + t.total, 0)
  const mediaGasto = totalGasto / trend.length
  const ultimo = trend[trend.length - 1]
  const penultimo = trend.length >= 2 ? trend[trend.length - 2] : null
  const tendencia = penultimo ? (ultimo.total >= penultimo.total ? 'up' : 'down') : null

  const chartData = trend.map((t) => ({ name: t.label, total: Math.round(t.total * 100) / 100 }))

  return (
    <div className="flex flex-col gap-5 px-4 md:px-6 pb-6">
      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-2xl bg-card p-4 border border-border/8">
          <p className="text-xs text-muted-foreground">Total 6 meses</p>
          <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(totalGasto)}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 border border-border/8">
          <p className="text-xs text-muted-foreground">Média mensal</p>
          <p className="text-lg font-bold tabular-nums mt-1">{formatCurrency(mediaGasto)}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 border border-border/8">
          <p className="text-xs text-muted-foreground">Tendência</p>
          <div className="flex items-center gap-1.5 mt-1">
            {tendencia === 'up' ? (
              <TrendingUp className="h-5 w-5" style={{ color: '#FF9500' }} />
            ) : tendencia === 'down' ? (
              <TrendingDown className="h-5 w-5" style={{ color: '#34C759' }} />
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
            <span
              className="text-base font-bold"
              style={{
                color:
                  tendencia === 'up' ? '#FF9500' : tendencia === 'down' ? '#34C759' : undefined,
              }}
            >
              {tendencia === 'up' ? 'Subindo' : tendencia === 'down' ? 'Caindo' : '—'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl bg-card p-5 border border-border/8"
      >
        <p className="text-sm font-semibold mb-4">Gastos mensais com materiais</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,122,255,0.08)', radius: 8 }} />
            <Bar dataKey="total" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, idx) => {
                const isLast = idx === chartData.length - 1
                const isMax = entry.total === Math.max(...chartData.map((d) => d.total))
                return (
                  <Cell
                    key={entry.name}
                    fill={isLast ? '#007AFF' : isMax ? '#FF3B30' : 'rgba(0,122,255,0.35)'}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Azul = mês atual · Vermelho = maior gasto
        </p>
      </motion.div>

      {/* Line chart (trend) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-2xl bg-card p-5 border border-border/8"
      >
        <p className="text-sm font-semibold mb-4">Evolução de custos</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<ChartTip />} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#007AFF"
              strokeWidth={2.5}
              dot={{ fill: '#007AFF', r: 4 }}
              activeDot={{ r: 6, fill: '#007AFF' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}

// ─── Tab: Histórico por Material ─────────────────────────────────────────────
