import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import { useFormDraft } from '@/hooks/use-form-draft'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type ContaPagarParcela,
  type ContaReceberParcela,
  type FinanceiroConta,
  type FinanceiroMovimentacaoWithConta,
  type MaterialCostTrendPoint,
  type ObraRow,
  useAllFinanceiroMovimentacoes,
  useContasPagarParcelas,
  useContasReceberParcelas,
  useCreateContaPagar,
  useCreateContaReceber,
  useCreateFinanceiroConta,
  useCreateFinanceiroMovimentacao,
  useDashboardStats,
  useDeleteContaPagar,
  useDeleteContaReceber,
  useDeleteFinanceiroConta,
  useFinanceiroContas,
  useFinanceiroMeta,
  useMaterialCostTrend,
  useObras,
  usePagarParcela,
  useReceberParcela,
  type useUpsertFinanceiroMeta,
} from '@/hooks/use-supabase'
import { useUndoableDelete } from '@/hooks/use-undoable-delete'
import { exportMovimentacoesCsv } from '@/lib/export-csv'
import {
  type CreateContaPagarInput,
  type CreateContaReceberInput,
  type CreateFinanceiroContaInput,
  createContaPagarSchema,
  createContaReceberSchema,
  createFinanceiroContaSchema,
} from '@/lib/schemas'
import { accents, cn, formatCurrency, formatDate, formatDateShort } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import type { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Package,
  Plus,
  Receipt,
  Search,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, type UseFormReturn, useForm } from 'react-hook-form'

import { clr, modalCn, tipos } from '../financeiro'
import { contaItemVariants, contaListVariants, contaSubLabel } from '../financeiro'
import { ringColor } from './primitives'

export function FinanceiroInsightsRow({
  s,
  pct,
  terrenosStandby,
  totalTerrenos,
  navigate,
}: {
  s: { orcamentoTotal?: number | null; custoTotal?: number | null } | undefined
  pct: number
  terrenosStandby: ObraRow[]
  totalTerrenos: number
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="px-4 md:px-6 mt-4 grid grid-cols-2 gap-3"
    >
      {/* Orçamento Obras */}
      <motion.div
        className="rounded-2xl bg-card border cursor-pointer"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate({ to: '/obras' })}
      >
        <div
          className="p-4 md:p-5 rounded-2xl overflow-hidden"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="flex items-center gap-2 mb-4 min-w-0">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
              style={{ backgroundColor: '#007AFF10' }}
            >
              <Wallet className="h-[17px] w-[17px]" style={{ color: '#007AFF' }} />
            </span>
            <span className="text-[12px] font-medium text-muted-foreground leading-tight truncate">
              Orçamento Obras
            </span>
          </div>
          <p className="text-[18px] md:text-[22px] font-bold tabular-nums leading-none tracking-tight truncate">
            {formatCurrency(s?.custoTotal ?? 0)}
          </p>
          <div className="mt-3">
            <div className="h-[4px] rounded-full overflow-hidden bg-border/20">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ backgroundColor: ringColor(pct) }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 gap-1 min-w-0">
              <span className="text-[11px] text-muted-foreground/60 tabular-nums truncate min-w-0">
                de {formatCurrency(s?.orcamentoTotal ?? 0)}
              </span>
              <span
                className="text-[11px] font-semibold tabular-nums flex-shrink-0"
                style={{ color: ringColor(pct) }}
              >
                {pct}%
              </span>
            </div>
          </div>
        </div>
        {/* inner overflow wrapper */}
      </motion.div>

      {/* Terrenos em Standby */}
      <motion.div
        className="rounded-2xl bg-card border cursor-pointer"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate({ to: '/obras' })}
      >
        <div
          className="p-4 md:p-5 rounded-2xl overflow-hidden"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="flex items-center gap-2 mb-4 min-w-0">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
              style={{ backgroundColor: '#AF52DE10' }}
            >
              <Landmark className="h-[17px] w-[17px]" style={{ color: '#AF52DE' }} />
            </span>
            <span className="text-[12px] font-medium text-muted-foreground leading-tight truncate">
              Terrenos Standby
            </span>
          </div>
          <p
            className="text-[18px] md:text-[22px] font-bold tabular-nums leading-none tracking-tight truncate"
            style={{ color: terrenosStandby.length > 0 ? '#AF52DE' : undefined }}
          >
            {formatCurrency(totalTerrenos)}
          </p>
          <div className="flex items-center justify-between mt-3 gap-1 min-w-0">
            <span className="text-[11px] text-muted-foreground/60 truncate min-w-0">
              Capital imobilizado
            </span>
            {terrenosStandby.length > 0 && (
              <span
                className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#AF52DE10', color: '#AF52DE' }}
              >
                {terrenosStandby.length} {terrenosStandby.length === 1 ? 'terreno' : 'terrenos'}
              </span>
            )}
          </div>
        </div>
        {/* inner overflow wrapper */}
      </motion.div>
    </motion.div>
  )
}

export function MaterialCostTrendPanel({ costTrend }: { costTrend: MaterialCostTrendPoint[] }) {
  const recent3 = costTrend.slice(-3)
  const older3 = costTrend.slice(-6, -3)

  const recentTotal = recent3.reduce((s, p) => s + p.total, 0)
  const olderTotal = older3.reduce((s, p) => s + p.total, 0)
  const trendPct = olderTotal > 0 ? ((recentTotal - olderTotal) / olderTotal) * 100 : 0
  const isUp = trendPct > 0

  // Bar chart data
  const maxTotal = Math.max(...costTrend.map((p) => p.total), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="mt-8 px-4 md:px-6"
    >
      <div className="rounded-[20px] bg-card border shadow-sm shadow-black/[0.03] p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF9500]/10 flex-shrink-0">
              <Package className="h-5 w-5 text-[#FF9500]" />
            </span>
            <div>
              <p className="text-[13px] text-muted-foreground/60 font-medium">
                Gastos com Materiais
              </p>
              <p className="text-[20px] font-bold tabular-nums tracking-tight leading-tight mt-0.5">
                {formatCurrency(recentTotal)}
              </p>
            </div>
          </div>
          {olderTotal > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full mt-1',
                isUp ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#34C759]/10 text-[#34C759]',
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUp ? '+' : ''}
              {trendPct.toFixed(1)}%
            </span>
          )}
        </div>

        {olderTotal > 0 && (
          <p className="text-[13px] text-muted-foreground/50 mb-4 leading-relaxed">
            {isUp
              ? `Seus gastos com materiais subiram ${Math.abs(trendPct).toFixed(0)}% nos últimos 3 meses`
              : `Seus gastos com materiais reduziram ${Math.abs(trendPct).toFixed(0)}% nos últimos 3 meses`}{' '}
            em relação ao trimestre anterior.
          </p>
        )}

        {/* Mini bar chart */}
        <div className="flex items-end gap-1.5 h-[64px]">
          {costTrend.map((point, i) => {
            const heightPct = (point.total / maxTotal) * 100
            const isRecent = i >= costTrend.length - 3
            return (
              <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, 4)}%` }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className={cn(
                    'w-full rounded-t-[4px] min-h-[3px]',
                    isRecent
                      ? isUp
                        ? 'bg-[#FF3B30]/70'
                        : 'bg-[#34C759]/70'
                      : 'bg-muted-foreground/10',
                  )}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {costTrend.map((point) => (
            <div key={point.month} className="flex-1 text-center">
              <span className="text-[9px] text-muted-foreground/35 font-medium">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
