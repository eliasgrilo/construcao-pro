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

export function FinanceiroHeroCard({
  contasLoading,
  totalDisponivel,
  totalCaixa,
  totalAplicado,
  meta,
  metaPct,
  setMetaModalOpen,
  setMetaInput,
}: {
  contasLoading: boolean
  totalDisponivel: number
  totalCaixa: number
  totalAplicado: number
  meta: number
  metaPct: number
  setMetaModalOpen: (open: boolean) => void
  setMetaInput: (val: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="px-4 md:px-6"
    >
      <div
        className="rounded-2xl bg-card border p-6 md:p-8 overflow-hidden"
        style={{ transform: 'translateZ(0)' }}
      >
        {/* Label + hero amount */}
        <p className="text-[13px] font-medium text-muted-foreground tracking-wide">
          Saldo Disponível
        </p>
        {contasLoading ? (
          <div className="h-[38px] w-48 rounded-lg bg-muted/60 animate-pulse mt-2" />
        ) : (
          <p
            className="text-[34px] md:text-[40px] font-bold tabular-nums tracking-tight leading-none mt-2 truncate"
            style={{ transform: 'translateZ(0)' }}
          >
            {formatCurrency(totalDisponivel)}
          </p>
        )}

        {/* Breakdown: Em Caixa · Aplicações — Apple Wallet list style */}
        <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-border/15">
          {/* Em Caixa */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                style={{ backgroundColor: '#34C75914' }}
              >
                <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
              </span>
              <span className="text-[13px] text-muted-foreground/70">Em Caixa</span>
            </div>
            {contasLoading ? (
              <div className="h-[16px] w-20 rounded bg-muted/60 animate-pulse" />
            ) : (
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: '#34C759' }}>
                {formatCurrency(totalCaixa)}
              </span>
            )}
          </div>
          {/* Aplicações */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                style={{ backgroundColor: '#007AFF14' }}
              >
                <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
              </span>
              <span className="text-[13px] text-muted-foreground/70">Aplicações</span>
            </div>
            {contasLoading ? (
              <div className="h-[16px] w-20 rounded bg-muted/60 animate-pulse" />
            ) : (
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: '#007AFF' }}>
                {formatCurrency(totalAplicado)}
              </span>
            )}
          </div>
        </div>

        {/* Meta — Apple Savings Goal: clean progress section */}
        {meta > 0 ? (
          <div className="mt-6 pt-5 border-t border-border/15">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] font-medium text-muted-foreground">Meta</span>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setMetaInput(formatBRL(meta.toFixed(2).replace('.', ',')))
                  setMetaModalOpen(true)
                }}
                className="text-[13px] font-medium transition-colors focus:outline-none min-h-[28px] flex items-center tabular-nums"
                style={{ color: '#5856D6' }}
              >
                {formatCurrency(meta)}
              </motion.button>
            </div>
            <div className="h-[6px] rounded-full overflow-hidden bg-border/20">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(metaPct, 100)}%` }}
                transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ backgroundColor: metaPct >= 100 ? '#34C759' : '#5856D6' }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              {metaPct >= 100 ? (
                <span
                  className="text-[12px] font-medium flex items-center gap-1"
                  style={{ color: '#34C759' }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Meta atingida
                </span>
              ) : (
                <span className="text-[12px] text-muted-foreground/60 tabular-nums">
                  Faltam{' '}
                  <span className="font-semibold text-foreground/70">
                    {formatCurrency(Math.max(meta - totalDisponivel, 0))}
                  </span>
                </span>
              )}
              <span
                className="text-[12px] font-semibold tabular-nums"
                style={{ color: metaPct >= 100 ? '#34C759' : '#5856D6' }}
              >
                {metaPct}%
              </span>
            </div>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setMetaInput('')
              setMetaModalOpen(true)
            }}
            className="mt-6 pt-5 border-t border-border/15 w-full flex items-center gap-2 text-[14px] font-medium transition-colors focus:outline-none min-h-[44px]"
            style={{ color: '#007AFF' }}
          >
            <Target className="h-4 w-4 flex-shrink-0" />
            Definir meta financeira
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
