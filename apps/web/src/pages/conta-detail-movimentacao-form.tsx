import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import { useFormDraft } from '@/hooks/use-form-draft'
import { useRegisterFinanceiroMovement } from '@/hooks/use-supabase'
import { type CreateMovimentacaoInput, createMovimentacaoSchema } from '@/lib/schemas'
import { cn, formatCurrency, todayISO } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  FileText,
  Landmark,
  Wallet,
  X,
} from 'lucide-react'
import React, { useId, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { DestinoCard } from './conta-detail-components'

// Using types mapped from conta-detail.tsx
type TipoMov = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

interface Conta {
  id: string
  banco: string
  agencia: string
  numeroConta: string
  valorCaixa: number
  valorAplicado: number
}

const TIPO_CFG: Record<
  TipoMov,
  { label: string; btnLabel: string; Icon: React.ElementType; color: string; iconBg: string }
> = {
  ENTRADA: {
    label: 'Entrada',
    btnLabel: 'Confirmar',
    Icon: ArrowDownRight,
    color: '#34C759',
    iconBg: '#34C75918',
  },
  SAIDA: {
    label: 'Saída',
    btnLabel: 'Confirmar',
    Icon: ArrowUpRight,
    color: '#FF3B30',
    iconBg: '#FF3B3018',
  },
  TRANSFERENCIA: {
    label: 'Transferir',
    btnLabel: 'Transferir',
    Icon: ArrowLeftRight,
    color: '#007AFF',
    iconBg: '#007AFF18',
  },
}

export function computeMovDeltas(
  tipo: TipoMov,
  subconta: 'CAIXA' | 'APLICADO',
  valor: number,
  transferenciaDestinoId: string | null,
  allContas: Conta[],
): {
  delta_caixa: number
  delta_aplicado: number
  destino_conta_id: string | null
  delta_destino_caixa: number
  transferencia_destino_id: string | null
} {
  const v = valor
  const isCaixa = subconta === 'CAIXA'

  if (tipo !== 'TRANSFERENCIA') {
    const sign = tipo === 'ENTRADA' ? 1 : -1
    return {
      delta_caixa: isCaixa ? sign * v : 0,
      delta_aplicado: isCaixa ? 0 : sign * v,
      destino_conta_id: null,
      delta_destino_caixa: 0,
      transferencia_destino_id: null,
    }
  }

  const isSwitch = !transferenciaDestinoId
  if (isSwitch) {
    return {
      delta_caixa: isCaixa ? -v : +v,
      delta_aplicado: isCaixa ? +v : -v,
      destino_conta_id: null,
      delta_destino_caixa: 0,
      transferencia_destino_id: null,
    }
  }

  const destExists = allContas.some((c) => c.id === transferenciaDestinoId)
  return {
    delta_caixa: isCaixa ? -v : 0,
    delta_aplicado: isCaixa ? 0 : -v,
    destino_conta_id: destExists ? transferenciaDestinoId : null,
    delta_destino_caixa: destExists ? +v : 0,
    transferencia_destino_id: transferenciaDestinoId,
  }
}

interface NovaMovimentacaoDialogProps {
  open: boolean
  setOpen: (v: boolean) => void
  conta: Conta | undefined
  contasAll: Conta[]
}

export function NovaMovimentacaoDialog({
  open,
  setOpen,
  conta,
  contasAll,
}: NovaMovimentacaoDialogProps) {
  const { toast } = useToast()
  const registerMovement = useRegisterFinanceiroMovement()

  const layoutIdPrefix = useId()
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const outrasContas = contasAll.filter((c) => c.id !== conta?.id)

  const movForm = useForm<CreateMovimentacaoInput>({
    resolver: zodResolver(createMovimentacaoSchema),
    mode: 'onTouched',
    defaultValues: {
      tipo: 'ENTRADA',
      subconta: 'CAIXA',
      motivo: '',
      valor: 0,
      transferenciaDestinoId: null,
    },
  })
  const { clearDraft } = useFormDraft(movForm, 'nova-movimentacao')

  const tipo = movForm.watch('tipo') as TipoMov
  const subconta = movForm.watch('subconta')
  const transferenciaDestino = movForm.watch('transferenciaDestinoId')

  function reset() {
    movForm.reset()
  }

  const handleAdd = movForm.handleSubmit(async (data) => {
    if (!conta) return

    const deltas = computeMovDeltas(
      data.tipo as TipoMov,
      data.subconta,
      data.valor,
      data.tipo === 'TRANSFERENCIA' ? data.transferenciaDestinoId : null,
      contasAll,
    )

    try {
      await registerMovement.mutateAsync({
        conta_id: conta.id,
        tipo: data.tipo,
        subconta: data.subconta,
        motivo: data.motivo,
        valor: data.valor,
        data: todayISO(),
        delta_caixa: deltas.delta_caixa,
        delta_aplicado: deltas.delta_aplicado,
        destino_conta_id: deltas.destino_conta_id,
        delta_destino_caixa: deltas.delta_destino_caixa,
        transferencia_destino_id: deltas.transferencia_destino_id,
      })
      toast({ title: 'Movimentação registrada', variant: 'success' })
      setOpen(false)
      clearDraft()
      reset()
    } catch {
      toast({ title: 'Erro ao registrar movimentação', variant: 'error' })
    }
  })

  if (!conta) return null

  const tipoCfg = TIPO_CFG[tipo]
  const TipoCfgIcon = tipoCfg.Icon

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="p-0 gap-0 border-0 dark:border dark:border-white/[0.07] sm:max-w-[420px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col !overflow-hidden">
        {/* Cabeçalho fixo */}
        <div className="flex-shrink-0 relative flex items-center px-5 pt-5 pb-4 gap-3.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={tipo}
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.65, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.3 }}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] flex-shrink-0"
              style={{ backgroundColor: tipoCfg.iconBg }}
            >
              <TipoCfgIcon className="h-[22px] w-[22px]" style={{ color: tipoCfg.color }} />
            </motion.span>
          </AnimatePresence>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-[17px] font-semibold tracking-tight leading-none">
              Nova Movimentação
            </DialogTitle>
            <DialogDescription className="sr-only">
              Registre uma nova movimentação financeira para esta conta
            </DialogDescription>
            <p className="text-[13px] text-foreground/45 mt-1 truncate">{conta.banco}</p>
          </div>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            onClick={() => {
              setOpen(false)
              reset()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Form area rolável */}
        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3">
          {/* Tipo selector */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="px-3 py-[10px]">
              <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
                {(['ENTRADA', 'SAIDA', 'TRANSFERENCIA'] as TipoMov[]).map((t) => {
                  const cfg = TIPO_CFG[t]
                  const active = tipo === t
                  const CfgIcon = cfg.Icon
                  return (
                    <motion.button
                      key={t}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => movForm.setValue('tipo', t)}
                      className={cn(
                        'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[13px] font-medium transition-colors z-10',
                        active ? '' : 'text-foreground/40',
                      )}
                      style={{ color: active ? cfg.color : undefined }}
                    >
                      {active && (
                        <motion.div
                          layoutId={`${layoutIdPrefix}-tipo-pill-ios`}
                          className="absolute inset-0 bg-white dark:bg-[#3A3A3C] rounded-[8px] shadow-sm -z-10"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.36 }}
                        />
                      )}
                      <CfgIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{cfg.label}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Subconta / Destino de transferência */}
          <AnimatePresence mode="wait">
            {tipo !== 'TRANSFERENCIA' ? (
              <motion.div
                key="subconta-normal"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]"
              >
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">
                    {tipo === 'ENTRADA' ? 'Destino' : 'Origem'}
                  </p>
                </div>
                <div className="px-3 pb-[10px]">
                  <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => movForm.setValue('subconta', 'CAIXA')}
                      className={cn(
                        'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                        subconta !== 'CAIXA' && 'text-foreground/40',
                      )}
                      style={{ color: subconta === 'CAIXA' ? '#34C759' : undefined }}
                    >
                      {subconta === 'CAIXA' && (
                        <motion.div
                          layoutId={`${layoutIdPrefix}-sc-ios-pill`}
                          className="absolute inset-0 bg-white dark:bg-[#3A3A3C] rounded-[8px] shadow-sm -z-10"
                          transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
                        />
                      )}
                      <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Em Caixa</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => movForm.setValue('subconta', 'APLICADO')}
                      className={cn(
                        'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[9px] text-[14px] font-medium transition-colors z-10',
                        subconta !== 'APLICADO' && 'text-foreground/40',
                      )}
                      style={{ color: subconta === 'APLICADO' ? '#007AFF' : undefined }}
                    >
                      {subconta === 'APLICADO' && (
                        <motion.div
                          layoutId={`${layoutIdPrefix}-sc-ios-pill`}
                          className="absolute inset-0 bg-white dark:bg-[#3A3A3C] rounded-[8px] shadow-sm -z-10"
                          transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
                        />
                      )}
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Aplicações</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="subconta-transf"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="space-y-[10px]"
              >
                {/* De */}
                <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">
                      De
                    </p>
                  </div>
                  <div className="px-3 pb-3 space-y-1.5">
                    <DestinoCard
                      selected={subconta === 'CAIXA'}
                      onSelect={() => movForm.setValue('subconta', 'CAIXA')}
                      icon={Wallet}
                      color="#34C759"
                      iconBg="#34C75914"
                      title="Em Caixa"
                      subtitle={`Disponível · ${formatCurrency(Number(conta.valorCaixa) || 0)}`}
                    />
                    <DestinoCard
                      selected={subconta === 'APLICADO'}
                      onSelect={() => movForm.setValue('subconta', 'APLICADO')}
                      icon={FileText}
                      color="#007AFF"
                      iconBg="#007AFF14"
                      title="Aplicações"
                      subtitle={`Disponível · ${formatCurrency(Number(conta.valorAplicado) || 0)}`}
                    />
                  </div>
                </div>
                {/* Para */}
                <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">
                      Para
                    </p>
                  </div>
                  <div className="px-3 pb-3 space-y-1.5">
                    <DestinoCard
                      selected={transferenciaDestino === null}
                      onSelect={() => movForm.setValue('transferenciaDestinoId', null)}
                      icon={subconta === 'CAIXA' ? FileText : Wallet}
                      color={subconta === 'CAIXA' ? '#007AFF' : '#34C759'}
                      iconBg={subconta === 'CAIXA' ? '#007AFF14' : '#34C75914'}
                      title={subconta === 'CAIXA' ? 'Aplicações' : 'Em Caixa'}
                      subtitle={`Saldo atual · ${formatCurrency(
                        subconta === 'CAIXA'
                          ? Number(conta.valorAplicado) || 0
                          : Number(conta.valorCaixa) || 0,
                      )}`}
                    />
                    {outrasContas.map((c) => (
                      <DestinoCard
                        key={c.id}
                        selected={transferenciaDestino === c.id}
                        onSelect={() => movForm.setValue('transferenciaDestinoId', c.id)}
                        icon={Landmark}
                        color="#AF52DE"
                        iconBg="#AF52DE14"
                        title={c.banco}
                        subtitle={`Em Caixa · ${formatCurrency(Number(c.valorCaixa) || 0)}`}
                      />
                    ))}
                    {outrasContas.length === 0 && (
                      <p className="text-[12px] text-foreground/40 text-center py-2">
                        Cadastre outras contas para transferir entre elas
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Valor + Descrição */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            {/* Valor */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55">
                Valor
              </span>
              <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                <span
                  className="text-[14px] flex-shrink-0 font-semibold"
                  style={{ color: `${tipoCfg.color}80` }}
                >
                  R$
                </span>
                <Controller
                  name="valor"
                  control={movForm.control}
                  render={({ field }) => (
                    <input
                      value={
                        field.value && field.value > 0
                          ? formatBRL(String(field.value).replace('.', ','))
                          : ''
                      }
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const formatted = formatBRL(e.target.value)
                        e.target.value = formatted
                        field.onChange(parseCurrency(formatted))
                      }}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="text-[18px] text-right bg-transparent outline-none tabular-nums font-bold min-w-0 w-[140px] placeholder:text-black/20 dark:placeholder:text-white/20"
                    />
                  )}
                />
              </div>
            </div>
            {movForm.formState.errors.valor && (
              <p className="text-[12px] px-4 pb-2" style={{ color: '#FF3B30' }}>
                {movForm.formState.errors.valor.message}
              </p>
            )}

            <div className="h-px mx-4 bg-black/[0.07] dark:bg-white/[0.07]" />

            {/* Descrição */}
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55">
                Descrição
              </span>
              <input
                {...movForm.register('motivo')}
                placeholder={
                  tipo === 'ENTRADA'
                    ? 'Depósito, Receita…'
                    : tipo === 'SAIDA'
                      ? 'Pagamento, Despesa…'
                      : 'Reserva, Aplicação…'
                }
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 placeholder:text-black/20 dark:placeholder:text-white/20"
              />
            </div>
            {movForm.formState.errors.motivo && (
              <p className="text-[12px] px-4 pb-2" style={{ color: '#FF3B30' }}>
                {movForm.formState.errors.motivo.message}
              </p>
            )}
          </div>
        </div>

        {/* CTA fixo no rodapé */}
        <StickyFooter>
          <div className="px-4 pt-3 pb-[var(--modal-pb,max(2rem,env(safe-area-inset-bottom)))] sm:pb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              whileTap={{
                scale: movForm.watch('motivo').trim() && movForm.watch('valor') > 0 ? 0.97 : 1,
              }}
              disabled={registerMovement.isPending}
              onClick={handleAdd}
              className={cn(
                'w-full flex items-center justify-center h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all',
                !registerMovement.isPending
                  ? 'text-white'
                  : 'bg-black/[0.07] dark:bg-white/[0.07] text-foreground/25 cursor-not-allowed',
              )}
              style={!registerMovement.isPending ? { backgroundColor: tipoCfg.color } : undefined}
            >
              {tipoCfg.btnLabel}
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
