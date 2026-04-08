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
import { useNavigate } from '@tanstack/react-router'
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

export function Ring({
  percent,
  size = 80,
  stroke = 6,
  color,
}: { percent: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    >
      <title>Círculo de Progresso</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-muted/40"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(percent, 100) / 100) * circ} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

export function ringColor(p: number) {
  return p > 90 ? clr.red : p > 70 ? clr.orange : clr.green
}

export function MovimentacaoListItem({
  mov,
  i,
  contas,
}: {
  mov: FinanceiroMovimentacaoWithConta
  i: number
  contas: FinanceiroConta[]
}) {
  const t = tipos[mov.tipo] ?? tipos.ENTRADA
  const Icon = t.icon
  const isEntrada = mov.tipo === 'ENTRADA'
  const isSaida = mov.tipo === 'SAIDA'
  const isTransf = mov.tipo === 'TRANSFERENCIA'
  const banco = mov.financeiro_contas?.banco ?? '—'
  const subconta = mov.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações'
  const amountColor = isTransf ? clr.blue : isSaida ? clr.red : clr.green

  return (
    <div
      key={mov.id}
      className={cn(
        'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4 transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]',
        i > 0 && 'border-t border-border/20',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
        style={{ backgroundColor: `${t.tint}14` }}
      >
        <Icon className="h-5 w-5" style={{ color: t.tint }} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] md:text-[16px] font-medium line-clamp-2 leading-snug">
          {mov.motivo ?? '—'}
        </p>
        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
          {banco}
          <span className="mx-1 opacity-40">·</span>
          {subconta}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-[16px] font-semibold tabular-nums" style={{ color: amountColor }}>
          {isTransf ? '' : isEntrada ? '+' : '−'}
          {formatCurrency(mov.valor ?? 0)}
        </p>
        <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
          {mov.data ? formatDateShort(mov.data) : formatDate(mov.created_at)}
        </p>
      </div>
    </div>
  )
}
