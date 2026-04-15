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
  useUpsertFinanceiroMeta,
} from '@/hooks/use-supabase'
import { useUndoableDelete } from '@/hooks/use-undoable-delete'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { exportMovimentacoesCsv } from '@/lib/export-csv'
import {
  buildInstallmentPreview,
  buildInstallmentSchedule,
  getRelativeDueLabel,
  groupItemsByMonth,
} from '@/lib/installments'
import {
  type CreateContaPagarInput,
  type CreateContaReceberInput,
  type CreateFinanceiroContaInput,
  createContaPagarSchema,
  createContaReceberSchema,
  createFinanceiroContaSchema,
} from '@/lib/schemas'
import { accents, cn, formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
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
import { MovimentacaoListItem, ringColor } from '../financeiro-widgets'
export function ReceberParcelaModal({
  parcela,
  contas,
  onClose,
  onConfirm,
  isPending,
}: {
  parcela: ContaReceberParcela | null
  contas: FinanceiroConta[]
  onClose: () => void
  onConfirm: (contaBancariaId: string, data: string, valor: number) => void
  isPending: boolean
}) {
  const [contaId, setContaId] = useState('')
  const [dataReceb, setDataReceb] = useState(() => todayISO())
  const [valorStr, setValorStr] = useState('')

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  useEffect(() => {
    if (parcela && contas.length > 0) {
      setContaId(contas[0].id)
      setDataReceb(todayISO())
      setValorStr(formatBRL(Number(parcela.valor).toFixed(2).replace('.', ',')))
    }
  }, [parcela, contas])

  const cachedParcela = useRef<ContaReceberParcela | null>(null)
  if (parcela) cachedParcela.current = parcela
  const activeParcela = parcela || cachedParcela.current

  if (!activeParcela) return null

  const valorRecebido = parseCurrency(valorStr)
  const desc = activeParcela.contas_receber?.descricao ?? '—'
  const isMulti = activeParcela.total_parcelas > 1
  const selectedConta = contas.find((c) => c.id === contaId)
  const canConfirm = !!contaId && !!dataReceb && valorRecebido > 0 && !isPending

  const shakeControls = useAnimation()
  const handleConfirm = async () => {
    if (!canConfirm) {
      await shakeControls.start({
        x: [0, -6, 6, -5, 5, -3, 3, 0],
        transition: { duration: 0.42, ease: 'easeInOut' },
      })
      return
    }
    onConfirm(contaId, dataReceb, valorRecebido)
  }

  return (
    <Dialog
      open={parcela !== null}
      onOpenChange={(v) => {
        if (!v && !isPending) onClose()
      }}
    >
      <DialogContent className={modalCn}>
        {/* Header */}
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Confirmar Recebimento
            </DialogTitle>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#34C75915', color: '#34C759' }}
            >
              Crédito
            </span>
          </div>
          <DialogDescription className="sr-only">
            Confirme o recebimento e crédito na conta bancária.
          </DialogDescription>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            disabled={isPending}
            onClick={onClose}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors focus-visible:outline-none"
          >
            <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Amount hero */}
        <div className="flex-shrink-0 flex flex-col items-center py-6">
          <div
            className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] mb-3"
            style={{
              background: 'linear-gradient(145deg, #30D158 0%, #25A244 100%)',
              boxShadow: '0 10px 30px rgba(52,199,89,0.40)',
            }}
          >
            <ArrowDownRight className="h-[28px] w-[28px] text-white" />
          </div>
          <p
            className="text-[38px] font-bold tabular-nums tracking-tight"
            style={{ color: '#34C759' }}
          >
            +{formatCurrency(valorRecebido > 0 ? valorRecebido : Number(activeParcela.valor))}
          </p>
          <p className="text-[14px] text-muted-foreground mt-1 text-center px-6 line-clamp-2">
            {desc}
            {isMulti ? ` · ${activeParcela.numero_parcela}/${activeParcela.total_parcelas}` : ''}
          </p>
        </div>

        {/* Form */}
        <div ref={formRef} className="flex-shrink-0 px-4 space-y-[10px] pb-3">
          {/* Conta bancária picker */}
          {contas.length > 1 ? (
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
              <div className="px-4 py-[10px]">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: '#8E8E93' }}
                >
                  Creditar em
                </p>
                <div className="space-y-1">
                  {contas.map((c) => {
                    const isSelected = contaId === c.id
                    return (
                      <motion.button
                        key={c.id}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setContaId(c.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors',
                          isSelected
                            ? 'bg-[#007AFF]/[0.05]'
                            : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]',
                        )}
                        style={
                          isSelected
                            ? { border: '1px solid rgba(0,122,255,0.25)' }
                            : { border: '1px solid transparent' }
                        }
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-[8px] flex-shrink-0"
                          style={{ backgroundColor: isSelected ? '#007AFF20' : '#8E8E9314' }}
                        >
                          <Landmark
                            className="h-4 w-4"
                            style={{ color: isSelected ? '#007AFF' : '#8E8E93' }}
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium leading-snug">{c.banco}</p>
                          <p className="text-[12px] text-muted-foreground tabular-nums">
                            Em Caixa: {formatCurrency(Number(c.valor_caixa) || 0)}
                          </p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          >
                            <CheckCircle2
                              className="h-5 w-5 flex-shrink-0"
                              style={{ color: '#007AFF' }}
                            />
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : contas.length === 1 ? (
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
              <div className="flex items-center gap-3 px-4 py-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: '#34C75914' }}
                >
                  <Landmark className="h-4 w-4" style={{ color: '#34C759' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">{contas[0].banco}</p>
                  <p className="text-[12px] text-muted-foreground">
                    Saldo atual: {formatCurrency(Number(contas[0].valor_caixa) || 0)}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
            </div>
          ) : null}

          {/* Valor + Data */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground">
                Valor
              </span>
              <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                <span
                  className="text-[14px] flex-shrink-0 font-semibold"
                  style={{ color: 'rgba(52,199,89,0.6)' }}
                >
                  R$
                </span>
                <input
                  value={valorStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setValorStr(formatBRL(e.target.value))}
                  inputMode="decimal"
                  className="text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold min-w-0 w-[130px] focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
                />
              </div>
            </div>
            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">Data</span>
              <input
                type="date"
                value={dataReceb}
                onChange={(e) => setDataReceb(e.target.value)}
                className="flex-1 text-[16px] text-right bg-transparent outline-none tabular-nums cursor-pointer min-w-0 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
              />
            </div>
          </div>

          {/* New balance preview */}
          <AnimatePresence>
            {selectedConta &&
              valorRecebido > 0 &&
              (() => {
                const novoSaldo = (Number(selectedConta.valor_caixa) || 0) + valorRecebido
                const positivo = novoSaldo >= 0
                const cor = positivo ? '#34C759' : '#FF3B30'
                return (
                  <motion.div
                    key="saldo-preview"
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="rounded-[14px] px-4 py-3"
                    style={{
                      backgroundColor: positivo ? 'rgba(52,199,89,0.06)' : 'rgba(255,59,48,0.06)',
                      border: `1px solid ${cor}20`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] text-muted-foreground">Saldo atual (caixa)</span>
                      <span className="text-[13px] font-medium tabular-nums text-muted-foreground">
                        {formatCurrency(Number(selectedConta.valor_caixa) || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold" style={{ color: cor }}>
                        {positivo ? 'Novo saldo em caixa' : 'Saldo insuficiente'}
                      </span>
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: cor }}>
                        {formatCurrency(novoSaldo)}
                      </span>
                    </div>
                  </motion.div>
                )
              })()}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <StickyFooter>
          <div className="px-4 pt-3 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 border-t border-black/[0.05] dark:border-white/[0.05] bg-[#F2F2F7] dark:bg-[#1C1C1E]">
            <motion.button
              animate={shakeControls}
              whileTap={{ scale: canConfirm ? 0.97 : 1 }}
              disabled={!canConfirm}
              onClick={handleConfirm}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                canConfirm
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={
                canConfirm
                  ? {
                      background: 'linear-gradient(135deg, #30D158, #25A244)',
                      boxShadow: '0 4px 16px rgba(52,199,89,0.35)',
                    }
                  : undefined
              }
            >
              {isPending && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {isPending ? 'Registrando…' : 'Registrar Recebimento'}
            </motion.button>
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
