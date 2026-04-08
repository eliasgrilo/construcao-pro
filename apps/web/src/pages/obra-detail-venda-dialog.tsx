import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Modal } from '@/components/Modal/Modal'
/**
 * ObraDetailVendaDialog — Multi-step "Registrar Venda" modal
 *
 * Step order: 1 Valor → 2 Destino → 3 Pagamento + Confirmar
 *
 * Split logic (preserved from original):
 *   • Conta 1 ALWAYS receives immediately (à vista), regardless of payment method
 *   • Payment method/installments ONLY apply to Conta 2
 *   • In non-split mode: payment method applies to the full amount
 *
 * Keyboard gap fix: uses useKeyboardOpen hook to hide footer and collapse
 * scroll area when soft keyboard is visible, preventing layout gaps.
 */
import { parseCurrency } from '@/components/ui/currency-input'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ContaFinanceira, ObraCustos } from './obra-detail'
import { getIsoDateWithOffset } from './obra-detail-state'
import {
  StepDestino,
  StepPagamento,
  StepValor,
  VENDA_STEPS,
  VENDA_STEP_META,
  type VendaStep,
  VendaStepIndicator,
  stepVariants,
} from './obra-detail-venda-steps'
import { VENDA_SPLIT_SUM_TOLERANCE } from './obra-detail-venda-utils'

export interface ObraDetailVendaDialogProps {
  vendaDialog: boolean
  setVendaDialog: (v: boolean) => void
  vendaInput: string
  setVendaInput: (v: string) => void
  vendaContaId: string
  setVendaContaId: (v: string) => void
  vendaSubconta: 'CAIXA' | 'APLICACAO' | 'APLICADO'
  setVendaSubconta: (v: 'CAIXA' | 'APLICACAO' | 'APLICADO') => void
  vendaFormaPagamento: string
  setVendaFormaPagamento: (v: string) => void
  vendaParcelas: string
  setVendaParcelas: (v: string) => void
  vendaTaxaCartao: string
  setVendaTaxaCartao: (v: string) => void
  vendaSplitEnabled: boolean
  setVendaSplitEnabled: (v: boolean) => void
  vendaSplitContaId: string
  setVendaSplitContaId: (v: string) => void
  vendaSplitValor: string
  setVendaSplitValor: (v: string) => void
  vendaConta1Valor: string
  setVendaConta1Valor: (v: string) => void
  vendaDataPagamento: string
  setVendaDataPagamento: (v: string) => void
  vendaDataPrimeiraParcela: string
  setVendaDataPrimeiraParcela: (v: string) => void
  vendaInputRef: React.RefObject<HTMLInputElement>
  handleConfirmarVenda: () => void
  vendaSubmitting: boolean
  contasFinanceiras: ContaFinanceira[]
  custos: ObraCustos | null
}

export function ObraDetailVendaDialog({
  vendaDialog,
  setVendaDialog,
  vendaInput,
  setVendaInput,
  vendaContaId,
  setVendaContaId,
  vendaSubconta,
  setVendaSubconta,
  vendaFormaPagamento,
  setVendaFormaPagamento,
  vendaParcelas,
  setVendaParcelas,
  vendaTaxaCartao,
  setVendaTaxaCartao,
  vendaSplitEnabled,
  setVendaSplitEnabled,
  vendaSplitContaId,
  setVendaSplitContaId,
  vendaSplitValor,
  setVendaSplitValor,
  vendaConta1Valor,
  setVendaConta1Valor,
  vendaDataPagamento,
  setVendaDataPagamento,
  vendaDataPrimeiraParcela,
  setVendaDataPrimeiraParcela,
  vendaInputRef,
  handleConfirmarVenda,
  vendaSubmitting,
  contasFinanceiras,
  custos,
}: ObraDetailVendaDialogProps) {
  // ── Local step state (internal UI concern, not lifted) ──
  const [step, setStep] = useState<VendaStep>('valor')
  const [stepDir, setStepDir] = useState(1)

  // Reset to step 1 whenever the dialog is opened (vendaDialog false→true).
  // The component stays mounted between sessions, so step would otherwise
  // persist at 'pagamento' after a successful venda submission.
  const prevVendaDialogRef = useRef(vendaDialog)
  useEffect(() => {
    const wasOpen = prevVendaDialogRef.current
    prevVendaDialogRef.current = vendaDialog
    if (vendaDialog && !wasOpen) {
      setStep('valor')
      setStepDir(1)
    }
  }, [vendaDialog])

  // ── Keyboard Toolbar hooks ──
  const formRef = useRef<HTMLDivElement>(null)
  const {
    focusNext,
    focusPrev,
    dismiss,
    canGoPrev: kbCanGoPrev,
    canGoNext: kbCanGoNext,
  } = useFormFieldNavigation(formRef)

  const resetForms = () => {
    setVendaInput('')
    setVendaContaId('')
    setVendaSubconta('CAIXA')
    setVendaFormaPagamento('')
    setVendaParcelas('')
    // Taxa cartão is cloud-persisted — don't clear it on reset.
    // The TaxaCartao component will restore from cloud on mount.
    setVendaSplitEnabled(false)
    setVendaSplitContaId('')
    setVendaSplitValor('')
    setVendaConta1Valor('')
    setVendaDataPagamento(getIsoDateWithOffset())
    setVendaDataPrimeiraParcela(getIsoDateWithOffset(30))
    setStep('valor')
    setStepDir(1)
  }

  const goStep = (next: VendaStep) => {
    const from = VENDA_STEPS.indexOf(step)
    const to = VENDA_STEPS.indexOf(next)
    const goingBack = to < from

    // Clear downstream state when navigating backward so steps
    // always start fresh — prevents stale partial selections from
    // causing a silently-disabled Confirmar button on re-entry.
    if (goingBack) {
      if (step === 'pagamento') {
        // Leaving step 3 backward: clear all payment selections so re-entry starts fresh
        setVendaFormaPagamento('')
        setVendaParcelas('')
        setVendaTaxaCartao('')
        setVendaDataPrimeiraParcela('')
      }
    }

    setStepDir(to > from ? 1 : -1)
    setStep(next)
  }

  // ── Per-step validation ──
  const vendaVal = parseCurrency(vendaInput)

  // Step 1 → 2: need a value
  const step1Ok = vendaVal > 0

  // Step 2 → 3: need account(s) set up correctly
  const c1v = parseCurrency(vendaConta1Valor)
  const c2v = parseCurrency(vendaSplitValor)
  const splitAccountsOk =
    !!vendaContaId &&
    !!vendaSplitContaId &&
    c1v > 0 &&
    c2v > 0 &&
    Math.abs(c1v + c2v - vendaVal) < VENDA_SPLIT_SUM_TOLERANCE
  const step2Ok = !!vendaContaId && (!vendaSplitEnabled || splitAccountsOk)

  // Step 3 confirm: payment method set + method-specific requirements
  const hasPagamento =
    !!vendaFormaPagamento &&
    (vendaFormaPagamento !== 'CARTAO_CREDITO' || (!!vendaParcelas && vendaTaxaCartao !== '')) &&
    (vendaFormaPagamento !== 'BOLETO' || (!!vendaParcelas && !!vendaDataPrimeiraParcela))

  const ready = step1Ok && step2Ok && hasPagamento && !vendaSubmitting

  const currentIdx = VENDA_STEPS.indexOf(step)
  const isLast = step === 'pagamento'
  const isFirst = step === 'valor'
  const nextStep = VENDA_STEPS[currentIdx + 1] as VendaStep | undefined
  const prevStep = VENDA_STEPS[currentIdx - 1] as VendaStep | undefined
  const canGoNext = step === 'valor' ? step1Ok : step === 'destino' ? step2Ok : false
  const meta = VENDA_STEP_META[currentIdx]
  const stepDesc = vendaSplitEnabled && meta.descSplit ? meta.descSplit : meta.desc

  const handleClose = () => {
    if (!vendaSubmitting) {
      setVendaDialog(false)
      resetForms()
    }
  }

  const footer = (
    <div className="w-full">
      {isLast ? (
        /* Last step: Confirm + Back */
        <div className="space-y-2">
          <motion.button
            whileTap={{ scale: ready ? 0.97 : 1 }}
            disabled={!ready || vendaSubmitting}
            onClick={handleConfirmarVenda}
            className="w-full flex items-center justify-center gap-2 h-[54px] rounded-[14px] text-[17px] font-semibold tracking-tight transition-all"
            style={
              ready
                ? {
                    background: 'linear-gradient(135deg,#5856D6,#AF52DE)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 16px rgba(88,86,214,0.3)',
                  }
                : {
                    backgroundColor: 'rgba(60,60,67,0.08)',
                    color: '#C7C7CC',
                    cursor: 'not-allowed',
                  }
            }
          >
            {vendaSubmitting ? (
              <div className="h-[18px] w-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <CheckCircle2 className="h-[18px] w-[18px]" />
            )}
            {vendaSubmitting ? 'Salvando…' : 'Confirmar Venda'}
          </motion.button>
          <button
            type="button"
            disabled={vendaSubmitting}
            onClick={() => prevStep && goStep(prevStep)}
            className="w-full flex items-center justify-center gap-1.5 h-[40px] text-[15px] font-medium disabled:opacity-30 rounded-[10px]"
            style={{ color: '#8E8E93' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      ) : (
        /* Steps 1 & 2: Next + Cancel/Back */
        <div className="flex items-center gap-3">
          {isFirst ? (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 flex items-center justify-center h-[50px] text-[15px] font-medium rounded-[12px]"
              style={{
                color: '#8E8E93',
                backgroundColor: 'rgba(120,120,128,0.1)',
              }}
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => prevStep && goStep(prevStep)}
              className="flex h-[50px] w-[50px] items-center justify-center rounded-[12px] flex-shrink-0"
              style={{ backgroundColor: 'rgba(120,120,128,0.1)' }}
            >
              <ArrowLeft className="h-[18px] w-[18px] text-foreground/60" />
            </button>
          )}

          <motion.button
            whileTap={{ scale: canGoNext ? 0.97 : 1 }}
            disabled={!canGoNext}
            onClick={() => nextStep && goStep(nextStep)}
            className="flex-1 flex items-center justify-center gap-2 h-[50px] rounded-[12px] text-[16px] font-semibold tracking-tight transition-all"
            style={
              canGoNext
                ? {
                    background: 'linear-gradient(135deg,#5856D6,#AF52DE)',
                    color: '#FFFFFF',
                    boxShadow: '0 3px 12px rgba(88,86,214,0.28)',
                  }
                : {
                    backgroundColor: 'rgba(60,60,67,0.08)',
                    color: '#C7C7CC',
                    cursor: 'not-allowed',
                  }
            }
          >
            Próximo
            {canGoNext && <ArrowRight className="h-4 w-4" />}
          </motion.button>
        </div>
      )}
    </div>
  )

  return (
    <Modal isOpen={vendaDialog} onClose={handleClose} footer={footer} noPadding>
      <div className="relative w-full bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col">
        <div ref={formRef}>
          {/* Header */}
          <div className="flex-shrink-0">
            <div
              className="h-[3px] w-full"
              style={{ background: 'linear-gradient(90deg,#5856D6 0%,#AF52DE 50%,#FF2D55 100%)' }}
            />
            <div className="flex items-center gap-3 px-5 pt-4 pb-2">
              <div
                className="h-[40px] w-[40px] rounded-[13px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg,#5856D6 0%,#AF52DE 100%)',
                  boxShadow: '0 4px 12px rgba(88,86,214,0.32)',
                }}
              >
                <Sparkles className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <h2 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white tracking-tight leading-tight">
                      {meta.title}
                    </h2>
                    <p className="text-[12px] leading-tight mt-[2px]" style={{ color: '#8E8E93' }}>
                      {stepDesc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button
                type="button"
                aria-label="Fechar"
                whileTap={{ scale: 0.85 }}
                disabled={vendaSubmitting}
                onClick={handleClose}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full flex-shrink-0 disabled:opacity-30"
                style={{ backgroundColor: 'rgba(120,120,128,0.12)' }}
              >
                <X className="h-[14px] w-[14px] text-foreground/60" />
              </motion.button>
            </div>
            <VendaStepIndicator currentStep={step} />
            <div style={{ height: '1px', backgroundColor: 'rgba(60,60,67,0.09)' }} />
          </div>

          {/* Body */}
          {/* Body — no overflow here; Modal's contentNoPad handles scrolling */}
          <div className="px-4 py-4">
            <AnimatePresence mode="wait" custom={stepDir} initial={false}>
              <motion.div
                key={step}
                custom={stepDir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {step === 'valor' && (
                  <StepValor
                    vendaInput={vendaInput}
                    setVendaInput={setVendaInput}
                    setVendaSplitValor={setVendaSplitValor}
                    setVendaConta1Valor={setVendaConta1Valor}
                    vendaInputRef={vendaInputRef}
                    custos={custos}
                  />
                )}
                {step === 'destino' && (
                  <StepDestino
                    contasFinanceiras={contasFinanceiras}
                    vendaInput={vendaInput}
                    vendaContaId={vendaContaId}
                    setVendaContaId={setVendaContaId}
                    vendaSubconta={vendaSubconta}
                    setVendaSubconta={setVendaSubconta}
                    vendaSplitEnabled={vendaSplitEnabled}
                    setVendaSplitEnabled={setVendaSplitEnabled}
                    vendaSplitContaId={vendaSplitContaId}
                    setVendaSplitContaId={setVendaSplitContaId}
                    vendaSplitValor={vendaSplitValor}
                    setVendaSplitValor={setVendaSplitValor}
                    vendaConta1Valor={vendaConta1Valor}
                    setVendaConta1Valor={setVendaConta1Valor}
                    vendaDataPagamento={vendaDataPagamento}
                    setVendaDataPagamento={setVendaDataPagamento}
                  />
                )}
                {step === 'pagamento' && (
                  <StepPagamento
                    vendaSplitEnabled={vendaSplitEnabled}
                    vendaInput={vendaInput}
                    vendaSplitValor={vendaSplitValor}
                    vendaFormaPagamento={vendaFormaPagamento}
                    setVendaFormaPagamento={setVendaFormaPagamento}
                    vendaParcelas={vendaParcelas}
                    setVendaParcelas={setVendaParcelas}
                    vendaTaxaCartao={vendaTaxaCartao}
                    setVendaTaxaCartao={setVendaTaxaCartao}
                    vendaDataPrimeiraParcela={vendaDataPrimeiraParcela}
                    setVendaDataPrimeiraParcela={setVendaDataPrimeiraParcela}
                    vendaContaId={vendaContaId}
                    vendaSubconta={vendaSubconta}
                    vendaConta1Valor={vendaConta1Valor}
                    contasFinanceiras={contasFinanceiras}
                    custos={custos}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <KeyboardToolbar
        onNext={focusNext}
        onPrev={focusPrev}
        onDone={dismiss}
        hasPrev={kbCanGoPrev}
        hasNext={kbCanGoNext}
      />
    </Modal>
  )
}
