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
import { useEffect, useMemo, useState } from 'react'
import { Controller, type UseFormReturn, useForm, useWatch } from 'react-hook-form'

import { clr, modalCn, tipos } from '../financeiro'
import { MovimentacaoListItem, ringColor } from '../financeiro-widgets'
export function NovaContaReceberModal({
  open,
  setOpen,
  form,
  isPending,
  onSubmit,
  obras,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  form: UseFormReturn<CreateContaReceberInput>
  isPending: boolean
  onSubmit: () => void
  obras: ObraRow[]
}) {
  const descricao = useWatch({ control: form.control, name: 'descricao' })
  const valor = useWatch({ control: form.control, name: 'valor' })
  const vencimento = useWatch({ control: form.control, name: 'vencimento' })
  const nParcelas = useWatch({ control: form.control, name: 'nParcelas' })

  const canSubmit = descricao.trim().length >= 2 && valor > 0 && !!vencimento && !isPending

  const [formaRecebimento, setFormaRecebimento] = useState('')
  const FORMAS_RECEBIMENTO = [
    { value: 'PIX', label: 'PIX' },
    { value: 'TED', label: 'TED' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'DINHEIRO', label: 'Dinheiro' },
  ] as const

  const parcelas = useMemo(
    () =>
      buildInstallmentSchedule({
        total: valor,
        firstDueDate: vencimento,
        installmentCount: nParcelas,
      }),
    [nParcelas, valor, vencimento],
  )

  const parcelasPreview = useMemo(() => {
    if (parcelas.length <= 1) return []
    return buildInstallmentPreview(parcelas, { limit: 3 })
  }, [parcelas])

  const shakeControls = useAnimation()
  const handleSubmit = async () => {
    if (isPending) return
    await form.trigger()
    const firstError = Object.keys(form.formState.errors)[0]
    if (firstError) {
      try {
        form.setFocus(firstError as Parameters<typeof form.setFocus>[0])
        document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch { /* Controller fields not focusable via setFocus */ }
      await shakeControls.start({
        x: [0, -10, 10, -8, 8, -5, 5, 0],
        transition: { duration: 0.42, ease: 'easeInOut' },
      })
      return
    }
    if (!canSubmit) {
      await shakeControls.start({
        x: [0, -10, 10, -8, 8, -5, 5, 0],
        transition: { duration: 0.42, ease: 'easeInOut' },
      })
      return
    }
    // Inject forma de recebimento into observacoes before calling parent onSubmit
    if (formaRecebimento) {
      const obsAtual = form.getValues('observacoes') ?? ''
      const label = FORMAS_RECEBIMENTO.find((f) => f.value === formaRecebimento)?.label ?? formaRecebimento
      const novaObs = obsAtual.trim() ? `Forma: ${label}\n${obsAtual}` : `Forma: ${label}`
      form.setValue('observacoes', novaObs)
    }
    onSubmit()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isPending) return
        setOpen(v)
        if (!v) {
          form.reset()
          setFormaRecebimento('')
        }
      }}
    >
      <DialogContent className={modalCn}>
        {/* Header */}
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Nova A Receber
            </DialogTitle>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#34C75915', color: '#34C759' }}
            >
              Recebimento
            </span>
          </div>
          <DialogDescription className="sr-only">
            Cadastre um novo recebimento com parcelas.
          </DialogDescription>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            disabled={isPending}
            onClick={() => {
              setOpen(false)
              form.reset()
            }}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors focus-visible:outline-none"
          >
            <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Icon hero */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-6">
          <div
            className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] mb-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #30D158 0%, #25A244 100%)',
              boxShadow: '0 10px 30px rgba(52,199,89,0.40)',
            }}
          >
            <ArrowDownRight className="h-[28px] w-[28px] text-white" />
          </div>
          <p className="text-[13px] text-foreground/40">Dados do recebimento</p>
        </div>

        {/* Form — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3">
          {/* Grupo 1: descricao + cliente */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground">
                Descrição
              </span>
              <input
                {...form.register('descricao')}
                placeholder="Ex: Venda Lote 5"
                autoComplete="off"
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
              />
            </div>
            <AnimatePresence>
              {form.formState.errors.descricao && (
                <motion.p
                  key="err-descricao"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="text-[12px] px-4 pb-2"
                  style={{ color: '#FF3B30' }}
                >
                  {form.formState.errors.descricao.message}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground">
                Cliente
              </span>
              <input
                {...form.register('cliente')}
                placeholder="Nome (opcional)"
                autoComplete="name"
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 placeholder:text-black/20 dark:placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Grupo 2: valor + parcelas + vencimento */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            {/* Valor */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                Valor Total
              </span>
              <div className="flex-1 flex items-center justify-end gap-1.5">
                <span
                  className="text-[14px] flex-shrink-0 font-semibold"
                  style={{ color: '#34C75980' }}
                >
                  R$
                </span>
                <Controller
                  name="valor"
                  control={form.control}
                  render={({ field }) => (
                    <input
                      value={
                        field.value && field.value > 0
                          ? formatBRL(String(field.value).replace('.', ','))
                          : ''
                      }
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const fmt = formatBRL(e.target.value)
                        e.target.value = fmt
                        field.onChange(parseCurrency(fmt))
                      }}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold min-w-0 w-[130px] placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
                    />
                  )}
                />
              </div>
            </div>
            <AnimatePresence>
              {form.formState.errors.valor && (
                <motion.p
                  key="err-valor"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="text-[12px] px-4 pb-2"
                  style={{ color: '#FF3B30' }}
                >
                  {form.formState.errors.valor.message}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />

            {/* Parcelas stepper */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                Parcelas
              </span>
              <div className="flex-1 flex items-center justify-end gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => form.setValue('nParcelas', Math.max(1, nParcelas - 1))}
                  disabled={nParcelas <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[20px] font-light transition-colors disabled:opacity-30"
                  style={{ backgroundColor: '#34C75912', color: '#34C759' }}
                >
                  −
                </motion.button>
                <span className="text-[17px] font-semibold tabular-nums w-6 text-center">
                  {nParcelas}
                </span>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => form.setValue('nParcelas', Math.min(60, nParcelas + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[20px] font-light transition-colors"
                  style={{ backgroundColor: '#34C75912', color: '#34C759' }}
                >
                  +
                </motion.button>
              </div>
            </div>
            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />

            {/* 1º Vencimento */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                {nParcelas > 1 ? '1º Vencimento' : 'Vencimento'}
              </span>
              <input
                type="date"
                {...form.register('vencimento')}
                className="flex-1 text-[16px] text-right bg-transparent outline-none tabular-nums cursor-pointer min-w-0 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
              />
            </div>
            <AnimatePresence>
              {form.formState.errors.vencimento && (
                <motion.p
                  key="err-vencimento"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="text-[12px] px-4 pb-2"
                  style={{ color: '#FF3B30' }}
                >
                  {form.formState.errors.vencimento.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Preview parcelas */}
          <AnimatePresence>
            {nParcelas > 1 && valor > 0 && vencimento && parcelasPreview.length > 0 && (
              <motion.div
                key="parcelas-preview"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]"
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide px-4 pt-3 pb-1"
                  style={{ color: '#8E8E93' }}
                >
                  Previsão de parcelas
                </p>
                <div className="px-4 py-2 relative">
                  <div
                    className="absolute top-4 bottom-4 w-px"
                    style={{ left: '26px', backgroundColor: '#34C75922' }}
                  />
                  {parcelasPreview.map((p, i) => (
                    <div key={p.label} className="flex items-center gap-3 py-[9px]">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white flex-shrink-0 relative z-10"
                        style={{ backgroundColor: '#34C759' }}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[13px] text-muted-foreground/60 tabular-nums">
                        {p.data}
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#34C759' }}>
                        {formatCurrency(p.valor)}
                      </span>
                    </div>
                  ))}
                  {nParcelas > 3 && (
                    <p className="text-[11px] text-muted-foreground/50 pl-8 pb-1">
                      +{nParcelas - 3} parcelas adicionais…
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forma de recebimento esperada */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E] px-4 py-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-2.5"
              style={{ color: '#8E8E93' }}
            >
              Forma de recebimento
              <span className="ml-1.5 normal-case font-normal text-[10px]">opcional</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {FORMAS_RECEBIMENTO.map(({ value, label }) => {
                const isSelected = formaRecebimento === value
                return (
                  <motion.button
                    key={value}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setFormaRecebimento(isSelected ? '' : value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-[7px] rounded-[10px] text-[14px] font-medium transition-colors',
                      isSelected ? 'text-white' : 'text-foreground/60',
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: '#34C759' }
                        : { backgroundColor: 'rgba(120,120,128,0.10)' }
                    }
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          key="check"
                          initial={{ scale: 0, opacity: 0, width: 0, marginRight: -4 }}
                          animate={{ scale: 1, opacity: 1, width: 14, marginRight: 0 }}
                          exit={{ scale: 0, opacity: 0, width: 0, marginRight: -4 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="flex-shrink-0 overflow-hidden"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {label}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Obra (optional) */}
          {obras.length > 0 && (
            <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
              <div className="flex items-center min-h-[52px] px-4 gap-3">
                <span className="text-[16px] font-medium flex-shrink-0 text-foreground">Obra</span>
                <span className="text-[12px] text-foreground/35 flex-shrink-0">opcional</span>
                <select
                  {...form.register('obraId')}
                  className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 cursor-pointer"
                  style={{ direction: 'rtl' }}
                >
                  <option value="">—</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* CTA footer */}
        <StickyFooter>
          <div className="px-4 pt-3 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              animate={shakeControls}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              onClick={handleSubmit}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                canSubmit
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={canSubmit ? { background: 'linear-gradient(135deg, #30D158, #25A244)', boxShadow: '0 4px 16px rgba(52,199,89,0.35)' } : undefined}
            >
              {isPending && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {isPending
                ? 'Salvando…'
                : nParcelas > 1
                  ? `Criar ${nParcelas} Parcelas`
                  : 'Cadastrar Recebimento'}
            </motion.button>
          </div>
        </StickyFooter>
      </DialogContent>
    </Dialog>
  )
}
