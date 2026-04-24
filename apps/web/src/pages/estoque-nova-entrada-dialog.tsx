import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import {
  type FinanceiroConta,
  type FornecedorRow,
  type MaterialRow,
  useCreateEntradaEstoqueFinanceiro,
  useCreateMovimentacaoEntrada,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn, formatCurrency, todayISO } from '@/lib/utils'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { CheckCircle2, Package, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { iosSheetDialogCn } from './dialog-styles'
import type { AlmoxByObraGroup } from './estoque-dialog-types'
import { ESTOQUE_PAYMENT_OPTIONS, parseCurrency } from './obra-detail-estoque-utils'

const clr = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
}

type NovaEntradaDialogProps = {
  open: boolean
  onClose: () => void
  materiaisList: MaterialRow[]
  almoxByObra: AlmoxByObraGroup[]
  contasList: FinanceiroConta[]
  fornecedoresList: FornecedorRow[]
}

export function NovaEntradaDialog({
  open,
  onClose,
  materiaisList,
  almoxByObra,
  contasList,
  fornecedoresList,
}: NovaEntradaDialogProps) {
  const { toast } = useToast()
  const formRef = useRef<HTMLDivElement>(null)
  const autofilledMaterialIdRef = useRef<string | null>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)
  const shakeControls = useAnimation()

  const createEntrada = useCreateMovimentacaoEntrada()
  const createEntradaFinanceiro = useCreateEntradaEstoqueFinanceiro()

  const [materialId, setMaterialId] = useState('')
  const [qty, setQty] = useState('')
  const [preco, setPreco] = useState('')
  const [unidade, setUnidade] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [almoxId, setAlmoxId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [obs, setObs] = useState('')
  const [contaId, setContaId] = useState('')
  const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')

  const selectedMaterial = useMemo(
    () => materiaisList.find((m) => m.id === materialId),
    [materiaisList, materialId],
  )
  const selectedConta = useMemo(
    () => contasList.find((c) => c.id === contaId),
    [contasList, contaId],
  )

  useEffect(() => {
    if (!selectedMaterial) {
      autofilledMaterialIdRef.current = null
      return
    }
    if (autofilledMaterialIdRef.current === selectedMaterial.id) return
    autofilledMaterialIdRef.current = selectedMaterial.id
    const raw = selectedMaterial.preco_unitario ?? 0
    setPreco(raw > 0 ? formatBRL(String(raw).replace('.', ',')) : '')
    setUnidade(selectedMaterial.unidade ?? selectedMaterial.categoria?.unidade ?? 'UN')
  }, [selectedMaterial])

  const entQtyNumber = Number(qty.replace(',', '.'))
  const entPrecoNumber = parseCurrency(preco)
  const entradaTotal =
    entQtyNumber > 0 ? entQtyNumber * (entPrecoNumber || selectedMaterial?.preco_unitario || 0) : 0
  const needsFinanceiro = entradaTotal > 0
  const isSubmitting = createEntrada.isPending || createEntradaFinanceiro.isPending

  const canSubmit =
    !!materialId &&
    !!qty &&
    entQtyNumber > 0 &&
    !!almoxId &&
    (!needsFinanceiro || (!!contaId && !!pagamento)) &&
    !isSubmitting

  const reset = useCallback(() => {
    autofilledMaterialIdRef.current = null
    setMaterialId('')
    setQty('')
    setPreco('')
    setUnidade('')
    setPagamento('')
    setAlmoxId('')
    setFornecedorId('')
    setObs('')
    setContaId('')
    setSubconta('CAIXA')
  }, [])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    reset()
    onClose()
  }, [isSubmitting, onClose, reset])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return

    const precoUnitario = entPrecoNumber || selectedMaterial?.preco_unitario || 0

    const onSuccess = () => {
      toast({ title: 'Entrada registrada com sucesso!', variant: 'success' })
      reset()
      onClose()
    }
    const onError = (error: Error) => {
      toast({ title: 'Erro ao registrar entrada', description: error?.message, variant: 'error' })
    }

    if (needsFinanceiro) {
      createEntradaFinanceiro.mutate(
        {
          p_material_id: materialId,
          p_almoxarifado_id: almoxId,
          p_quantidade: entQtyNumber,
          p_preco_unitario: precoUnitario,
          p_conta_id: contaId,
          p_subconta: subconta,
          p_motivo: `Compra: ${selectedMaterial?.nome ?? 'Material'}${obs ? ` — ${obs}` : ''}`,
          p_data: todayISO(),
          p_unidade: unidade || undefined,
          p_observacao: obs.trim() || undefined,
          p_fornecedor_id: fornecedorId || undefined,
          p_forma_pagamento: pagamento,
        },
        { onSuccess, onError },
      )
      return
    }

    createEntrada.mutate(
      {
        p_material_id: materialId,
        p_almoxarifado_id: almoxId,
        p_quantidade: entQtyNumber,
        p_preco_unitario: precoUnitario,
        p_unidade: unidade || undefined,
        p_observacao: obs.trim() || undefined,
        p_fornecedor_id: fornecedorId || undefined,
        p_forma_pagamento: pagamento || undefined,
      },
      { onSuccess, onError },
    )
  }, [
    canSubmit,
    entPrecoNumber,
    selectedMaterial,
    needsFinanceiro,
    createEntradaFinanceiro,
    materialId,
    almoxId,
    entQtyNumber,
    contaId,
    subconta,
    obs,
    unidade,
    fornecedorId,
    pagamento,
    createEntrada,
    reset,
    onClose,
    toast,
  ])

  const handleTap = async () => {
    if (isSubmitting) return
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
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent className={iosSheetDialogCn}>
        {/* Header */}
        <div className="flex-shrink-0 relative flex items-center justify-center px-5 pt-4 pb-2">
          <div className="flex flex-col items-center gap-1">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Nova Entrada
            </DialogTitle>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${clr.green}18`, color: clr.green }}
            >
              Estoque
            </span>
          </div>
          <DialogDescription className="sr-only">
            Registre uma nova entrada de material no estoque
          </DialogDescription>
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.86 }}
            disabled={isSubmitting}
            onClick={handleClose}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] hover:bg-black/[0.13] dark:hover:bg-white/[0.18] transition-colors focus-visible:outline-none"
          >
            <X className="h-[14px] w-[14px] text-foreground/60" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Hero icon */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-6">
          <div
            className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] mb-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #4CD964 0%, #34C759 100%)',
              boxShadow: '0 10px 30px rgba(52,199,89,0.38)',
            }}
          >
            <Package className="h-[28px] w-[28px] text-white" />
          </div>
          <p className="text-[13px] text-foreground/40">Dados da entrada de estoque</p>
        </div>

        {/* Form — scrollable */}
        <div
          ref={formRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-[10px] pb-3"
        >
          {/* ── Grupo 1: Material + Almoxarifado ── */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground">
                Material <span style={{ color: clr.red }}>*</span>
              </span>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 appearance-none cursor-pointer"
                style={{ direction: 'rtl' }}
              >
                <option value="" style={{ direction: 'ltr' }}>
                  Selecionar…
                </option>
                {materiaisList.map((m) => (
                  <option key={m.id} value={m.id} style={{ direction: 'ltr' }}>
                    {m.nome}
                    {m.codigo ? ` · ${m.codigo}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Material metadata preview */}
            <AnimatePresence>
              {selectedMaterial && (
                <motion.div
                  key="material-detail"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
                  <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
                    {selectedMaterial.categoria?.nome && (
                      <Badge variant="secondary" className="text-[11px]">
                        {selectedMaterial.categoria.nome}
                      </Badge>
                    )}
                    <span className="text-[12px] text-muted-foreground">
                      Unid:{' '}
                      <strong>
                        {selectedMaterial.unidade ?? selectedMaterial.categoria?.unidade ?? '—'}
                      </strong>
                    </span>
                    {(selectedMaterial.preco_unitario ?? 0) > 0 && (
                      <span className="text-[12px] ml-auto text-muted-foreground">
                        Último: <strong>{formatCurrency(selectedMaterial.preco_unitario)}</strong>
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />

            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                Destino <span style={{ color: clr.red }}>*</span>
              </span>
              <select
                value={almoxId}
                onChange={(e) => setAlmoxId(e.target.value)}
                className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 appearance-none cursor-pointer text-foreground/70"
                style={{ direction: 'rtl' }}
              >
                <option value="" style={{ direction: 'ltr' }}>
                  Almoxarifado…
                </option>
                {almoxByObra.map(([obraId, { obraNome, almoxs }]) => (
                  <optgroup key={obraId} label={obraNome}>
                    {almoxs.map((almox) => (
                      <option key={almox.id} value={almox.id} style={{ direction: 'ltr' }}>
                        {almox.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* ── Grupo 2: Quantidade + Preço ── */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground">
                Qtd <span style={{ color: clr.red }}>*</span>
              </span>
              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                <input
                  placeholder="0"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/[^\d,.]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  className="w-[100px] text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
                />
                <input
                  placeholder="UN"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value.toUpperCase())}
                  className="w-[44px] text-[14px] text-right bg-transparent outline-none text-foreground/50 uppercase placeholder:text-black/20 dark:placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />

            <div className="flex items-center min-h-[52px] px-4 gap-3">
              <span className="text-[16px] font-medium w-[90px] flex-shrink-0 text-foreground/55">
                Preço Unit.
              </span>
              <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                <span
                  className="text-[14px] flex-shrink-0 font-semibold"
                  style={{ color: `${clr.green}80` }}
                >
                  R$
                </span>
                <input
                  value={preco}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPreco(formatBRL(e.target.value))}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="text-[16px] text-right bg-transparent outline-none tabular-nums font-semibold min-w-0 w-[130px] placeholder:text-black/20 dark:placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 rounded-sm"
                />
              </div>
            </div>

            {/* Total preview — slides in when price × qty > 0 */}
            <AnimatePresence>
              {entradaTotal > 0 && (
                <motion.div
                  key="subtotal"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
                  <div className="flex items-center px-4 py-3 justify-between">
                    <span className="text-[14px] text-muted-foreground">Total da entrada</span>
                    <span
                      className="text-[16px] font-bold tabular-nums"
                      style={{ color: clr.green }}
                    >
                      {formatCurrency(entradaTotal)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Grupo 3: Forma de Pagamento (chips) ── */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E] px-4 py-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-2.5"
              style={{ color: '#8E8E93' }}
            >
              Forma de pagamento
              <span
                className="ml-1.5 normal-case font-normal text-[10px]"
                style={{ color: needsFinanceiro && !pagamento ? clr.red : '#8E8E93' }}
              >
                {needsFinanceiro && !pagamento ? '* obrigatório' : 'opcional'}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ESTOQUE_PAYMENT_OPTIONS.map(({ value, label }) => {
                const isSelected = pagamento === value
                return (
                  <motion.button
                    key={value}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setPagamento(isSelected ? '' : value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-[7px] rounded-[10px] text-[14px] font-medium transition-colors',
                      isSelected ? 'text-white' : 'text-foreground/60',
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: clr.green }
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

          {/* ── Grupo 4: Financeiro (conta + subconta) — only when price > 0 ── */}
          <AnimatePresence>
            {needsFinanceiro && (
              <motion.div
                key="financeiro-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="overflow-hidden"
              >
                <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
                  <div className="flex items-center min-h-[52px] px-4 gap-3">
                    <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                      Conta <span style={{ color: clr.red }}>*</span>
                    </span>
                    <span className="text-[12px] text-foreground/35 flex-shrink-0">débito</span>
                    <select
                      value={contaId}
                      onChange={(e) => setContaId(e.target.value)}
                      className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 appearance-none cursor-pointer text-foreground/70"
                      style={{ direction: 'rtl' }}
                    >
                      <option value="" style={{ direction: 'ltr' }}>
                        Selecionar conta…
                      </option>
                      {contasList.map((c) => (
                        <option key={c.id} value={c.id} style={{ direction: 'ltr' }}>
                          {c.banco}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subconta toggle + debit preview */}
                  <AnimatePresence>
                    {selectedConta && (
                      <motion.div
                        key="subconta"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
                        <div className="px-4 py-3 space-y-2.5">
                          <div className="flex gap-2">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setSubconta('CAIXA')}
                              className={cn(
                                'flex-1 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                                subconta === 'CAIXA'
                                  ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF] font-medium'
                                  : 'border-border/40 text-muted-foreground',
                              )}
                            >
                              Caixa
                              <span className="block text-[11px] mt-0.5 font-normal opacity-70">
                                {formatCurrency(Number(selectedConta.valor_caixa))}
                              </span>
                            </motion.button>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setSubconta('APLICADO')}
                              className={cn(
                                'flex-1 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                                subconta === 'APLICADO'
                                  ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF] font-medium'
                                  : 'border-border/40 text-muted-foreground',
                              )}
                            >
                              Aplicado
                              <span className="block text-[11px] mt-0.5 font-normal opacity-70">
                                {formatCurrency(Number(selectedConta.valor_aplicado))}
                              </span>
                            </motion.button>
                          </div>
                          <div className="flex items-center justify-between text-[12px] border-t border-border/10 dark:border-white/[0.06] mt-1 pt-2.5">
                            <span className="text-muted-foreground">Débito previsto</span>
                            <span className="font-semibold" style={{ color: clr.red }}>
                              −{formatCurrency(entradaTotal)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Grupo 5: Fornecedor + Observação ── */}
          <div className="rounded-[14px] overflow-hidden bg-white dark:bg-[#2C2C2E]">
            {fornecedoresList.length > 0 && (
              <>
                <div className="flex items-center min-h-[52px] px-4 gap-3">
                  <span className="text-[16px] font-medium flex-shrink-0 text-foreground">
                    Fornecedor
                  </span>
                  <span className="text-[12px] text-foreground/35 flex-shrink-0">opcional</span>
                  <select
                    value={fornecedorId}
                    onChange={(e) => setFornecedorId(e.target.value)}
                    className="flex-1 text-[16px] text-right bg-transparent outline-none min-w-0 appearance-none cursor-pointer text-foreground/70"
                    style={{ direction: 'rtl' }}
                  >
                    <option value="" style={{ direction: 'ltr' }}>
                      Nenhum
                    </option>
                    {fornecedoresList.map((f) => (
                      <option key={f.id} value={f.id} style={{ direction: 'ltr' }}>
                        {f.nome_fantasia || f.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="h-px ml-4 bg-black/[0.07] dark:bg-white/[0.07]" />
              </>
            )}
            <div className="flex items-start min-h-[52px] px-4 py-3 gap-3">
              <span className="text-[16px] font-medium flex-shrink-0 text-foreground/55 mt-[2px]">
                Obs.
              </span>
              <textarea
                placeholder="Nota fiscal, lote, referência…"
                rows={2}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
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
              disabled={isSubmitting}
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
                      background: 'linear-gradient(135deg, #4CD964, #34C759)',
                      boxShadow: '0 4px 16px rgba(52,199,89,0.35)',
                    }
                  : undefined
              }
            >
              {isSubmitting && (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {isSubmitting ? 'Registrando…' : 'Registrar Entrada'}
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
