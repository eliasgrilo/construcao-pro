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

export function OrcamentoTab() {
  const qc = useQueryClient()
  const { data: custoPorObra, isLoading, error } = useDashboardCustoPorObra()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div className="text-center">
          <h3 className="text-base font-semibold">Erro ao carregar dados</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Verifique sua conexão e tente novamente
          </p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })}
          className="flex items-center gap-2 h-10 rounded-xl bg-primary px-5 text-[14px] font-semibold text-white transition-all active:scale-[0.97] hover:bg-primary/90"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
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

  const totalOrcamento = custoPorObra.reduce((sum, o) => sum + (o.orcamento || 0), 0)
  const totalCusto = custoPorObra.reduce((sum, o) => sum + (o.custo || 0), 0)
  const totalPercentual = totalOrcamento > 0 ? Math.round((totalCusto / totalOrcamento) * 100) : 0

  return (
    <div className="flex flex-col gap-6 px-4 md:px-6 pb-6">
      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-card p-5 border border-border/8"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Orçamento Total</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums mt-1.5">
              {formatCurrency(totalOrcamento)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Custo Total</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums mt-1.5">
              {formatCurrency(totalCusto)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo</p>
            <p
              className="text-xl md:text-2xl font-bold tabular-nums mt-1.5"
              style={{ color: totalCusto > totalOrcamento ? '#FF3B30' : '#34C759' }}
            >
              {formatCurrency(Math.abs(totalOrcamento - totalCusto))}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalCusto > totalOrcamento ? 'Excedido' : 'Disponível'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">% Gasto</p>
            <p
              className="text-xl md:text-2xl font-bold tabular-nums mt-1.5"
              style={{ color: ringColor(totalPercentual) }}
            >
              {totalPercentual}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl bg-card border border-border/8 overflow-hidden"
      >
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border/8 bg-muted/30">
          {['Obra', 'Status', 'Orçamento', 'Gasto', 'Saldo / %', '% Gasto'].map((h, i) => (
            <div
              key={h}
              className={cn(
                'col-span-2',
                i === 0 && 'col-span-3',
                i === 1 && 'col-span-1',
                i >= 2 && 'text-right',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
                {h}
              </p>
            </div>
          ))}
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {custoPorObra.map((row, idx) => {
            const statusInfo = statusMap[row.status] || {
              label: row.status,
              color: '#666',
              bgColor: '#66666618',
            }
            const saldo = (row.orcamento || 0) - (row.custo || 0)
            const isOverbudget = saldo < 0
            return (
              <motion.div key={row.id} variants={rowVariants}>
                {/* Desktop row */}
                <div
                  className={cn(
                    'hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border/8 items-center hover:bg-accent/40 transition-colors',
                    idx % 2 === 0 && 'bg-muted/5',
                  )}
                >
                  <div className="col-span-3 min-w-0">
                    <p className="font-medium text-sm truncate">{row.obra}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.endereco}</p>
                  </div>
                  <div className="col-span-1">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-medium text-sm tabular-nums">
                      {formatCurrency(row.orcamento || 0)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-medium text-sm tabular-nums">
                      {formatCurrency(row.custo || 0)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isOverbudget ? (
                        <TrendingDown className="h-4 w-4 text-destructive flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      <div>
                        <p
                          className="font-medium text-sm tabular-nums"
                          style={{ color: isOverbudget ? '#FF3B30' : '#34C759' }}
                        >
                          {formatCurrency(Math.abs(saldo))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isOverbudget ? 'Excedido' : 'Disponível'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <p
                        className="font-semibold text-sm tabular-nums"
                        style={{ color: ringColor(row.percentual) }}
                      >
                        {formatNumber(row.percentual)}%
                      </p>
                      <div className="w-24 h-1 rounded-full bg-muted/20 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(row.percentual, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + idx * 0.02 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: ringColor(row.percentual) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden rounded-xl bg-card p-4 border border-border/8 mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{row.obra}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{row.endereco}</p>
                    </div>
                    <span
                      className="ml-2 inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Orçamento</span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(row.orcamento || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Gasto</span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(row.custo || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Saldo</span>
                      <span
                        className="text-sm font-medium tabular-nums"
                        style={{ color: isOverbudget ? '#FF3B30' : '#34C759' }}
                      >
                        {formatCurrency(Math.abs(saldo))}
                      </span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-border/8">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium">% Gasto</span>
                        <span
                          className="text-xs font-semibold tabular-nums"
                          style={{ color: ringColor(row.percentual) }}
                        >
                          {formatNumber(row.percentual)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(row.percentual, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: ringColor(row.percentual) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Tab: Ranking de Fornecedores ────────────────────────────────────────────
