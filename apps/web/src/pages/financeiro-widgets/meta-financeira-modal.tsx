import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
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
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, type UseFormReturn, useForm } from 'react-hook-form'

import { clr, modalCn, tipos } from '../financeiro'
import { contaItemVariants, contaListVariants, contaSubLabel } from '../financeiro'

export function MetaFinanceiraModal({
  metaModalOpen,
  setMetaModalOpen,
  metaInput,
  setMetaInput,
  meta,
  totalDisponivel,
  upsertMeta,
}: {
  metaModalOpen: boolean
  setMetaModalOpen: (o: boolean) => void
  metaInput: string
  setMetaInput: (v: string) => void
  meta: number
  totalDisponivel: number
  upsertMeta: ReturnType<typeof useUpsertFinanceiroMeta>
}) {
  const { toast } = useToast()
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  return (
    <Dialog
      open={metaModalOpen}
      onOpenChange={(v) => {
        setMetaModalOpen(v)
        if (!v) setMetaInput('')
      }}
    >
      <DialogContent className={modalCn}>
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-3 pb-3">
          <DialogTitle className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white tracking-tight">
            Meta Financeira
          </DialogTitle>
          <DialogDescription className="sr-only">
            Defina sua meta de capital disponível.
          </DialogDescription>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            onClick={() => {
              setMetaModalOpen(false)
              setMetaInput('')
            }}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
          </motion.button>
        </div>

        <div ref={formRef} className="flex-shrink-0 px-4 pt-1 pb-3">
          <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] px-5 pt-5 pb-5">
            <p
              className="text-[11px] font-semibold tracking-wide mb-4"
              style={{ color: '#8E8E93' }}
            >
              {meta > 0 ? 'Atualizar meta' : 'Definir meta'}
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className="text-[22px] font-semibold flex-shrink-0"
                style={{ color: '#8E8E93' }}
              >
                R$
              </span>
              <input
                value={metaInput}
                onChange={(e) => setMetaInput(formatBRL(e.target.value))}
                placeholder="0,00"
                inputMode="decimal"
                className="flex-1 min-w-0 text-[40px] font-bold tabular-nums tracking-tight outline-none bg-transparent text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-[#48484A] caret-[#007AFF]"
              />
            </div>
            <div
              className="flex items-center justify-between mt-4 pt-4"
              style={{ borderTop: '1px solid rgba(60,60,67,0.1)' }}
            >
              <span className="text-[13px]" style={{ color: '#8E8E93' }}>
                Disponível hoje
              </span>
              <span
                className="text-[13px] font-semibold tabular-nums"
                style={{ color: totalDisponivel > 0 ? '#34C759' : '#8E8E93' }}
              >
                {formatCurrency(totalDisponivel)}
              </span>
            </div>
          </div>
        </div>

        {parseCurrency(metaInput) > 0 &&
          (() => {
            const previewPct = Math.min(
              Math.round((totalDisponivel / parseCurrency(metaInput)) * 100),
              100,
            )
            const previewColor = previewPct >= 100 ? '#34C759' : '#5856D6'
            return (
              <div className="flex-shrink-0 px-4 pb-3">
                <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] px-5 py-4">
                  <div className="flex items-center justify-between mb-[10px]">
                    <span className="text-[13px]" style={{ color: '#8E8E93' }}>
                      Progresso
                    </span>
                    <span
                      className="text-[13px] font-semibold tabular-nums"
                      style={{ color: previewColor }}
                    >
                      {previewPct}%
                    </span>
                  </div>
                  <div
                    className="h-[6px] rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(60,60,67,0.08)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${previewPct}%` }}
                      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                      style={{ backgroundColor: previewColor }}
                    />
                  </div>
                  <p
                    className="text-[12px] tabular-nums mt-2"
                    style={{
                      color: previewPct >= 100 ? '#34C759' : '#8E8E93',
                      fontWeight: previewPct >= 100 ? 600 : 400,
                    }}
                  >
                    {previewPct >= 100
                      ? 'Meta já atingida com o saldo atual'
                      : `Faltam ${formatCurrency(Math.max(parseCurrency(metaInput) - totalDisponivel, 0))}`}
                  </p>
                </div>
              </div>
            )
          })()}

        <div className="flex-1 min-h-[12px]" />

        {/* ── CTA fixo no rodapé (hidden when keyboard is open) ── */}
        <StickyFooter>
          <div className="px-4 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 space-y-2">
            <motion.button
              whileTap={{ scale: parseCurrency(metaInput) > 0 ? 0.97 : 1 }}
              disabled={parseCurrency(metaInput) <= 0 || upsertMeta.isPending}
              onClick={() => {
                const v = parseCurrency(metaInput)
                if (v > 0) {
                  upsertMeta.mutate(v, {
                    onSuccess: () => {
                      setMetaModalOpen(false)
                      setMetaInput('')
                    },
                    onError: () => toast({ title: 'Erro ao salvar meta', variant: 'error' }),
                  })
                }
              }}
              className="w-full flex items-center justify-center h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all"
              style={
                parseCurrency(metaInput) > 0 && !upsertMeta.isPending
                  ? { backgroundColor: '#007AFF', color: '#FFFFFF' }
                  : {
                      backgroundColor: 'rgba(60,60,67,0.08)',
                      color: '#C7C7CC',
                      cursor: 'not-allowed',
                    }
              }
            >
              {upsertMeta.isPending ? 'Salvando…' : 'Salvar Meta'}
            </motion.button>
            {meta > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={upsertMeta.isPending}
                onClick={() => {
                  upsertMeta.mutate(0, {
                    onSuccess: () => {
                      setMetaModalOpen(false)
                      setMetaInput('')
                    },
                    onError: () => toast({ title: 'Erro ao remover meta', variant: 'error' }),
                  })
                }}
                className="w-full flex items-center justify-center h-[44px] text-[15px] font-medium disabled:opacity-50"
                style={{ color: '#FF3B30' }}
              >
                Remover Meta
              </motion.button>
            )}
          </div>
        </StickyFooter>
        <KeyboardToolbar
          onNext={focusNext}
          onPrev={focusPrev}
          onDone={dismiss}
          hasPrev={canGoPrev}
          hasNext={canGoNext}
        />
      </DialogContent>
    </Dialog>
  )
}
