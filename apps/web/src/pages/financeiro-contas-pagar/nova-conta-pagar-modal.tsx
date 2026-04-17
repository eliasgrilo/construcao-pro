import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import { useFormDraft } from '@/hooks/use-form-draft'
import { type ObraRow, useCreateContaPagar } from '@/hooks/use-supabase'
import { scrollFieldIntoView, useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { buildInstallmentSchedule } from '@/lib/installments'
import { type CreateContaPagarInput, createContaPagarSchema } from '@/lib/schemas'
import { cn, formatCurrency } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { CheckCircle2, CreditCard, FileText, Receipt, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { clr, modalCn } from '../financeiro'

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TED', label: 'TED' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
]

const CATEGORIAS = [
  'Materiais',
  'Fornecedores',
  'Funcionários',
  'Aluguel',
  'Equipamentos',
  'Serviços',
  'Impostos',
  'Outros',
]

export function NovaContaPagarModal({
  open,
  setOpen,
  obras,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  obras: ObraRow[]
}) {
  const { toast } = useToast()
  const createContaPagar = useCreateContaPagar()

  const form = useForm<CreateContaPagarInput>({
    resolver: zodResolver(createContaPagarSchema),
    mode: 'onTouched',
    defaultValues: {
      descricao: '',
      categoria: 'Materiais',
      obraId: '',
      observacoes: '',
      valor: 0,
      vencimento: '',
      nParcelas: 1,
    },
  })
  const { clearDraft } = useFormDraft(form, 'conta-pagar')

  const valor = form.watch('valor')
  const nParcelas = form.watch('nParcelas')
  const vencimento = form.watch('vencimento')
  const descricaoVal = form.watch('descricao')

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const parcelas = useMemo(
    () =>
      buildInstallmentSchedule({
        total: valor,
        firstDueDate: vencimento,
        installmentCount: nParcelas,
      }),
    [nParcelas, valor, vencimento],
  )

  const isPending = createContaPagar.isPending

  // ── Forma de pagamento (local — appended to observacoes on save) ──
  const [formaPagamento, setFormaPagamento] = useState<string>('')
  const [taxaCartaoStr, setTaxaCartaoStr] = useState('') // "2,5" → %/parcela para CARTAO
  const [diaVencBoleto, setDiaVencBoleto] = useState('') // "10" → dia do mês para BOLETO

  const boletoInvalido =
    formaPagamento === 'BOLETO' &&
    (diaVencBoleto.trim() === '' || Number(diaVencBoleto) < 1 || Number(diaVencBoleto) > 31)
  const canSubmit =
    descricaoVal.trim().length >= 2 &&
    valor > 0 &&
    !!vencimento &&
    !!formaPagamento &&
    !boletoInvalido &&
    !isPending

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      // Prepend forma de pagamento to observacoes when set
      const obsBase = data.observacoes?.trim() ?? ''
      const formaLabel =
        FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label ?? formaPagamento
      let extras = ''
      if (formaPagamento === 'CARTAO' && taxaCartaoStr)
        extras = ` · Taxa: ${taxaCartaoStr}%/parcela`
      if (formaPagamento === 'BOLETO' && diaVencBoleto) extras = ` · Venc. dia ${diaVencBoleto}`
      const obsComForma = formaPagamento
        ? obsBase
          ? `Forma: ${formaLabel}${extras}\n${obsBase}`
          : `Forma: ${formaLabel}${extras}`
        : obsBase || null

      await createContaPagar.mutateAsync({
        descricao: data.descricao,
        categoria: data.categoria,
        obra_id: data.obraId || null,
        observacoes: obsComForma,
        valor_total: data.valor,
        parcelas,
      })
      setOpen(false)
      form.reset()
      clearDraft()
      setFormaPagamento('')
      setTaxaCartaoStr('')
      setDiaVencBoleto('')
      toast({ title: 'Conta a pagar criada', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Erro ao criar conta a pagar',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  })

  const shakeControls = useAnimation()
  const handleTap = async () => {
    if (isPending) return
    await form.trigger()
    const firstError = Object.keys(form.formState.errors)[0]
    if (firstError) {
      try {
        form.setFocus(firstError as Parameters<typeof form.setFocus>[0])
        const field = document.querySelector(
          `[name="${window.CSS?.escape?.(firstError) ?? firstError}"]`,
        )
        if (field instanceof HTMLElement) {
          scrollFieldIntoView(field)
        }
      } catch {
        /* Controller fields not focusable via setFocus */
      }
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
    handleSubmit()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isPending) return
        setOpen(v)
        if (!v) {
          form.reset()
          clearDraft()
          setFormaPagamento('')
          setTaxaCartaoStr('')
          setDiaVencBoleto('')
        }
      }}
    >
      <DialogContent className={modalCn}>
        {/* Header */}
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Nova Conta a Pagar
            </DialogTitle>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#FF3B3015', color: '#FF3B30' }}
            >
              Despesa
            </span>
          </div>
          <DialogDescription className="sr-only">
            Registre uma conta a pagar com parcelas.
          </DialogDescription>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            disabled={isPending}
            onClick={() => {
              setOpen(false)
              form.reset()
              clearDraft()
              setFormaPagamento('')
              setTaxaCartaoStr('')
              setDiaVencBoleto('')
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
              background: 'linear-gradient(145deg, #FF6B6B 0%, #FF3B30 100%)',
              boxShadow: '0 10px 30px rgba(255,59,48,0.38)',
            }}
          >
            <Receipt className="h-[28px] w-[28px] text-white" />
          </div>
          <p className="text-[13px] text-foreground/40">Dados da conta a pagar</p>
        </div>

        {/* Form — scrollable */}
        <div
          ref={formRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3"
        >
          {/* Grupo 1: Descrição + Categoria + Obra */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground">
                Descrição
              </span>
              <input
                {...form.register('descricao')}
                placeholder="Cimento, elétrica…"
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
                Categoria
              </span>
              <select
                {...form.register('categoria')}
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 appearance-none cursor-pointer"
                style={{ direction: 'rtl' }}
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat} style={{ direction: 'ltr' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            {obras.length > 0 && (
              <>
                <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
                <div className="flex items-center min-h-[52px] px-4 gap-3">
                  <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                    Obra
                  </span>
                  <span className="text-[12px] text-foreground/35 flex-shrink-0">opcional</span>
                  <select
                    {...form.register('obraId')}
                    className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 appearance-none cursor-pointer text-foreground/70"
                    style={{ direction: 'rtl' }}
                  >
                    <option value="" style={{ direction: 'ltr' }}>
                      Nenhuma
                    </option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id} style={{ direction: 'ltr' }}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Grupo 2: Valor + Vencimento */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground/55">
                Valor Total
              </span>
              <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                <span className="text-[14px] flex-shrink-0 font-semibold text-[#FF3B3080]">R$</span>
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
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                {nParcelas > 1 ? '1º Vencimento' : 'Vencimento'}
              </span>
              <input
                type="date"
                {...form.register('vencimento')}
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 tabular-nums text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
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

          {/* Grupo 2b: Forma de pagamento */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E] px-4 py-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-2.5"
              style={{ color: '#8E8E93' }}
            >
              Forma de pagamento
              <span
                className="ml-1.5 normal-case font-normal text-[10px]"
                style={{ color: !formaPagamento ? '#FF3B30' : '#8E8E93' }}
              >
                {!formaPagamento ? '* obrigatório' : 'selecionado'}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {FORMAS_PAGAMENTO.map(({ value, label }) => {
                const isSelected = formaPagamento === value
                return (
                  <motion.button
                    key={value}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setFormaPagamento(isSelected ? '' : value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-[7px] rounded-[10px] text-[14px] font-medium transition-colors',
                      isSelected ? 'text-white' : 'text-foreground/60',
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: clr.red }
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

          {/* Campos condicionais: Cartão (taxa) · Boleto (dia vencimento fixo) */}
          <AnimatePresence>
            {formaPagamento === 'CARTAO' && (
              <motion.div
                key="cartao-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
                  <div className="flex items-center min-h-[52px] px-4 gap-3">
                    <CreditCard className="h-4 w-4 flex-shrink-0" style={{ color: '#5856D6' }} />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[16px] font-medium text-foreground">
                        Taxa por parcela
                      </span>
                      {nParcelas > 1 && (
                        <span className="text-[11px]" style={{ color: '#5856D680' }}>
                          incide em {nParcelas}× abaixo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <input
                        value={taxaCartaoStr}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9,.]/, '').replace('.', ',')
                          setTaxaCartaoStr(v)
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0,00"
                        inputMode="decimal"
                        className="w-[72px] text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#5856D6]/60 rounded-sm"
                      />
                      <span className="text-[14px] font-semibold text-foreground/50 flex-shrink-0">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {formaPagamento === 'BOLETO' && (
              <motion.div
                key="boleto-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
                  <div className="flex items-center min-h-[52px] px-4 gap-3">
                    <FileText className="h-4 w-4 flex-shrink-0 text-foreground/40" />
                    <span className="text-[16px] font-medium flex-1 text-foreground">
                      Dia de vencimento
                    </span>
                    <div className="flex items-center gap-1 min-w-0">
                      <input
                        value={diaVencBoleto}
                        onChange={(e) => {
                          const n = e.target.value.replace(/\D/g, '').slice(0, 2)
                          const num = Number(n)
                          if (n === '' || (num >= 1 && num <= 31)) setDiaVencBoleto(n)
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="10"
                        inputMode="numeric"
                        className="w-[48px] text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
                      />
                      <span className="text-[13px] text-foreground/40 flex-shrink-0">/ mês</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grupo 3: Parcelas stepper + preview */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
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
                  style={{ backgroundColor: `${clr.red}12`, color: clr.red }}
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
                  style={{ backgroundColor: `${clr.red}12`, color: clr.red }}
                >
                  +
                </motion.button>
              </div>
            </div>

            {/* Parcelas preview — animated */}
            <AnimatePresence>
              {parcelas.length > 1 && (
                <motion.div
                  key="parcelas-preview"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="overflow-hidden border-t border-black/[0.07] dark:border-white/[0.07]"
                >
                  <div className="px-4 py-2 relative">
                    <div
                      className="absolute top-4 bottom-4 w-px"
                      style={{ left: '26px', backgroundColor: `${clr.red}22` }}
                    />
                    {parcelas.slice(0, 12).map((p) => (
                      <div key={p.numero_parcela} className="flex items-center gap-3 py-[9px]">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white flex-shrink-0 relative z-10"
                          style={{ backgroundColor: clr.red }}
                        >
                          {p.numero_parcela}
                        </span>
                        <span className="flex-1 text-[13px] text-muted-foreground/60 tabular-nums">
                          {new Date(`${p.vencimento}T12:00:00`).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span
                          className="text-[13px] font-semibold tabular-nums"
                          style={{ color: clr.red }}
                        >
                          {formatCurrency(p.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {nParcelas > 12 && (
                    <div className="flex items-center justify-center py-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-[12px] text-muted-foreground/40">
                        +{nParcelas - 12} parcelas adicionais…
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Observações */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-start min-h-[52px] px-4 py-3 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55 mt-[2px]">
                Obs.
              </span>
              <textarea
                {...form.register('observacoes')}
                placeholder="Anotações opcionais…"
                rows={2}
                className="flex-1 text-[15px] bg-transparent outline-none min-w-0 resize-none placeholder:text-black/20 dark:placeholder:text-white/20 text-foreground"
              />
            </div>
          </div>
        </div>

        {/* CTA footer */}
        <StickyFooter>
          <div className="px-4 pt-3 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              animate={shakeControls}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              disabled={isPending}
              onClick={handleTap}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                canSubmit
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={
                canSubmit
                  ? {
                      background: 'linear-gradient(135deg, #FF6B6B, #FF3B30)',
                      boxShadow: '0 4px 16px rgba(255,59,48,0.35)',
                    }
                  : undefined
              }
            >
              {isPending && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {isPending
                ? 'Salvando…'
                : nParcelas > 1
                  ? `Criar ${nParcelas} Parcelas`
                  : 'Criar Conta a Pagar'}
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
