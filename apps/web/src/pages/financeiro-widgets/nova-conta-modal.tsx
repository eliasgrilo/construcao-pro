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
import { useEffect, useMemo, useState, useRef } from 'react'
import { Controller, type UseFormReturn, useForm } from 'react-hook-form'
import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'

import { clr, modalCn, tipos } from '../financeiro'
import { contaItemVariants, contaListVariants, contaSubLabel } from '../financeiro'

export function NovaContaModal({
  modalOpen,
  setModalOpen,
  form,
  handleAddConta: handleAddContaProp,
  isPending,
}: {
  modalOpen: boolean
  setModalOpen: (o: boolean) => void
  form: UseFormReturn<CreateFinanceiroContaInput>
  handleAddConta: () => void
  isPending: boolean
}) {
  const subcontaNova = form.watch('subconta')
  const tipoNova = form.watch('tipo')
  const banco = form.watch('banco')
  const valorInicial = form.watch('valorInicial')
  const canSubmit = banco.trim().length > 0 && valorInicial >= 0 && !isPending

  const TIPOS_CONTA = [
    { value: 'Corrente', label: 'Corrente' },
    { value: 'Poupança', label: 'Poupança' },
    { value: 'Investimento', label: 'Invest.' },
  ] as const

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const shakeControls = useAnimation()
  const handleAddConta = async () => {
    if (isPending) return
    const isValid = await form.trigger()
    if (!isValid || !canSubmit) {
      try {
        const firstError = Object.keys(form.formState.errors)[0]
        form.setFocus(firstError as Parameters<typeof form.setFocus>[0])
        document
          .querySelector(`[name="${firstError}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch {}
      await shakeControls.start({
        x: [0, -6, 6, -5, 5, -3, 3, 0],
        transition: { duration: 0.42, ease: 'easeInOut' },
      })
      return
    }
    handleAddContaProp()
  }

  return (
    <Dialog
      open={modalOpen}
      onOpenChange={(open) => {
        if (!open && isPending) return
        setModalOpen(open)
        if (!open) form.reset()
      }}
    >
      <DialogContent className={modalCn}>
        {/* ── Cabeçalho fixo: título centrado + botão fechar ── */}
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Nova Conta
            </DialogTitle>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#007AFF15', color: '#007AFF' }}
            >
              Conta Bancária
            </span>
          </div>
          <DialogDescription className="sr-only">
            Preencha os dados da nova conta bancária.
          </DialogDescription>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            onClick={() => {
              setModalOpen(false)
              form.reset()
            }}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
          </motion.button>
        </div>

        {/* ── Ícone + subtítulo (parte do header fixo) ── */}
        <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-7">
          <div
            className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] mb-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #2196FF 0%, #0050D8 100%)',
              boxShadow: '0 10px 30px rgba(0,122,255,0.40)',
            }}
          >
            <Landmark className="h-[28px] w-[28px] text-white" />
          </div>
          <p className="text-[13px] text-foreground/40">Dados da conta bancária</p>
        </div>

        {/* ── Formulário agrupado — área rolável ── */}
        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3">
          {/* Grupo 1: informações do banco */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            {/* Banco */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[80px] flex-shrink-0 text-foreground">
                Banco
              </span>
              <input
                {...form.register('banco')}
                placeholder="Itaú, Nubank…"
                autoComplete="organization"
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
              />
            </div>
            <AnimatePresence>
              {form.formState.errors.banco && (
                <motion.p
                  key="err-banco"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="text-[12px] px-4 pb-2"
                  style={{ color: '#FF3B30' }}
                >
                  {form.formState.errors.banco.message}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
            {/* Agência */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[80px] flex-shrink-0 text-foreground">
                Agência
              </span>
              <input
                {...form.register('agencia')}
                placeholder="0001"
                inputMode="numeric"
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 tabular-nums placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
              />
            </div>
            <AnimatePresence>
              {form.formState.errors.agencia && (
                <motion.p
                  key="err-agencia"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="text-[12px] px-4 pb-2"
                  style={{ color: '#FF3B30' }}
                >
                  {form.formState.errors.agencia.message}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
            {/* Número da conta */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">Conta</span>
              <span className="text-[12px] text-foreground/35 flex-shrink-0">opcional</span>
              <input
                {...form.register('numeroConta')}
                placeholder="12345-6"
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 tabular-nums placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
              />
            </div>
          </div>

          {/* Grupo 2: Tipo de conta — 3-way Apple segmented */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E] px-3 py-[10px]">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-2.5 px-1"
              style={{ color: '#8E8E93' }}
            >
              Tipo de conta
            </p>
            <div className="relative flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
              <div
                className="absolute top-[3px] bottom-[3px] rounded-[8px] bg-white dark:bg-[#3A3A3C] shadow-sm pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                style={{
                  width: 'calc((100% - 6px) / 3)',
                  transform: `translateX(calc(${TIPOS_CONTA.findIndex((t) => t.value === tipoNova)} * (100% + 3px)))`,
                }}
              />
              {TIPOS_CONTA.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue('tipo', value)}
                  className="relative flex-1 flex items-center justify-center rounded-[8px] py-[9px] text-[13px] font-medium transition-colors z-10"
                  style={{ color: tipoNova === value ? '#007AFF' : undefined }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grupo 3: saldo inicial — subconta picker + valor único */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="px-3 pt-3 pb-2">
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-2 px-1"
                style={{ color: '#8E8E93' }}
              >
                Subconta
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'CAIXA', label: 'Em Caixa', Icon: Wallet, color: '#34C759' },
                    { value: 'APLICADO', label: 'Aplicações', Icon: FileText, color: '#007AFF' },
                  ] as const
                ).map(({ value, label, Icon, color }) => {
                  const isSelected = subcontaNova === value
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => form.setValue('subconta', value)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 py-3 px-3 rounded-[12px] transition-all',
                        isSelected
                          ? 'bg-white dark:bg-[#3A3A3C]'
                          : 'bg-black/[0.04] dark:bg-white/[0.06]',
                      )}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${color}` } : {}}
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="absolute top-1.5 right-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" style={{ color }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Icon className="h-5 w-5" style={{ color: isSelected ? color : undefined }} />
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: isSelected ? color : undefined }}
                      >
                        {label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
            <div className="h-px mx-4 bg-black/[0.07] dark:bg-white/[0.07]" />
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55">
                Saldo Inicial
              </span>
              <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                <span
                  className="text-[14px] flex-shrink-0 font-semibold"
                  style={{ color: subcontaNova === 'CAIXA' ? '#34C75980' : '#007AFF80' }}
                >
                  R$
                </span>
                <Controller
                  name="valorInicial"
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
                        // Format as BR currency while typing, then parse to number for form
                        const formatted = formatBRL(e.target.value)
                        e.target.value = formatted
                        field.onChange(parseCurrency(formatted))
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
              {form.formState.errors.valorInicial && (
                <motion.p
                  key="err-valorInicial"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="text-[12px] px-4 pb-2"
                  style={{ color: '#FF3B30' }}
                >
                  {form.formState.errors.valorInicial.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── CTA fixo no rodapé (hidden when keyboard is open) ── */}
        <StickyFooter>
          <div className="px-4 pt-3 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              animate={shakeControls}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              disabled={!canSubmit}
              onClick={handleAddConta}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                canSubmit
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={
                canSubmit
                  ? {
                      background: 'linear-gradient(135deg, #2196FF, #0050D8)',
                      boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
                    }
                  : undefined
              }
            >
              {isPending && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {isPending ? 'Salvando…' : 'Criar Conta'}
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
