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

export function ContasGrid({
  contasLoading,
  contas,
  handleOpenModal,
  handleDeleteConta,
  canManageFinanceiro,
}: {
  contasLoading: boolean
  contas: FinanceiroConta[]
  handleOpenModal: () => void
  handleDeleteConta: (id: string, e: React.MouseEvent) => void
  canManageFinanceiro: boolean
}) {
  const navigate = useNavigate()
  return (
    <AnimatePresence mode="popLayout">
      {contasLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-16"
        >
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </motion.div>
      ) : contas.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ backgroundColor: '#007AFF10' }}
          >
            <CreditCard className="h-7 w-7" style={{ color: '#007AFF' }} />
          </span>
          <p className="text-[17px] font-semibold">Nenhuma conta cadastrada</p>
          <p className="text-[14px] text-muted-foreground mt-1.5 text-center max-w-[240px] leading-relaxed">
            Adicione suas contas bancárias para acompanhar o saldo
          </p>
          {canManageFinanceiro && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenModal}
              className="mt-6 flex items-center gap-1.5 px-5 py-3 rounded-xl text-[15px] font-medium text-white transition-opacity hover:opacity-90 min-h-[48px]"
              style={{ backgroundColor: '#007AFF' }}
            >
              <Plus className="h-4 w-4" />
              Adicionar Conta
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial="hidden"
          animate="show"
          variants={contaListVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {contas.map((conta, i) => {
            const accent = accents[i % accents.length]
            const total = (Number(conta.valor_caixa) || 0) + (Number(conta.valor_aplicado) || 0)
            const sub = contaSubLabel(conta)
            return (
              <motion.div
                key={conta.id}
                layout
                variants={contaItemVariants}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  navigate({ to: '/financeiro/$contaId', params: { contaId: conta.id } })
                }
                className="rounded-[20px] bg-card border shadow-sm shadow-black/[0.04] relative cursor-pointer active:scale-[0.97] transition-transform"
              >
                <div
                  className="p-5 md:p-6 rounded-[20px] relative group overflow-hidden"
                  style={{ transform: 'translateZ(0)' }}
                >
                  {/* Delete */}
                  {canManageFinanceiro && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleDeleteConta(conta.id, e)}
                      className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: '#FF3B3012' }}
                    >
                      <Trash2 className="h-4 w-4" style={{ color: clr.red }} />
                    </motion.button>
                  )}

                  {/* Bank icon */}
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[12px] mb-4"
                    style={{ backgroundColor: accent.bg }}
                  >
                    <Landmark className="h-[18px] w-[18px]" style={{ color: accent.fg }} />
                  </span>

                  {/* Bank name */}
                  <p className="text-[16px] font-semibold line-clamp-2 pr-9">{conta.banco}</p>

                  {/* Agencia + Numero */}
                  {sub && (
                    <p className="flex items-center gap-1 text-[13px] text-muted-foreground mt-0.5 leading-snug">
                      <CreditCard className="h-3 w-3 shrink-0 opacity-50" />
                      <span className="leading-snug">{sub}</span>
                    </p>
                  )}

                  {/* Total */}
                  <p className="text-[26px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mt-3 whitespace-nowrap">
                    {formatCurrency(total)}
                  </p>

                  {/* Em Caixa / Aplicações breakdown */}
                  <div className="flex items-stretch gap-3 mt-4 pt-4 border-t border-border/30">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                          style={{ backgroundColor: '#34C75914' }}
                        >
                          <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
                        </span>
                        <p className="text-[11px] text-muted-foreground">Em Caixa</p>
                      </div>
                      <p
                        className="text-[14px] font-semibold tabular-nums leading-none truncate"
                        style={{ color: '#34C759' }}
                      >
                        {formatCurrency(Number(conta.valor_caixa) || 0)}
                      </p>
                    </div>
                    <div className="w-px bg-border/30 self-stretch flex-shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                          style={{ backgroundColor: '#007AFF14' }}
                        >
                          <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
                        </span>
                        <p className="text-[11px] text-muted-foreground">Aplicações</p>
                      </div>
                      <p
                        className="text-[14px] font-semibold tabular-nums leading-none truncate"
                        style={{ color: '#007AFF' }}
                      >
                        {formatCurrency(Number(conta.valor_aplicado) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
