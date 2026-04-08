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
import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { useUpdateUserPreference, useUserPreference } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Percent,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ContaFinanceira, ObraCustos } from '../obra-detail'
import { ObraDetailVendaPreview } from '../obra-detail'
import { calcPMT } from '../obra-detail-venda-utils'

// ─── Step config ──────────────────────────────────────────────────────────────

export type VendaStep = 'valor' | 'destino' | 'pagamento'
export const VENDA_STEPS: VendaStep[] = ['valor', 'destino', 'pagamento']
export const VENDA_STEP_META: Array<{
  label: string
  title: string
  desc: string
  descSplit?: string
}> = [
  { label: 'Valor', title: 'Valor de Venda', desc: 'Qual o valor da venda?' },
  { label: 'Destino', title: 'Conta de Destino', desc: 'Para onde vai o dinheiro?' },
  {
    label: 'Pagamento',
    title: 'Forma de Pagamento',
    desc: 'Como o comprador vai pagar?',
    descSplit: 'Como a Conta 2 será paga?',
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Shared constants ─────────────────────────────────────────────────────────

const ACCENT_COLORS = ['#007AFF', '#34C759', '#FF9F0A', '#AF52DE', '#FF375F', '#5AC8FA']

const PAYMENT_OPTIONS = [
  { value: 'PIX', label: 'PIX', Icon: Zap, color: '#34C759' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito', Icon: CreditCard, color: '#5856D6' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito', Icon: CreditCard, color: '#007AFF' },
  { value: 'TRANSFERENCIA', label: 'Transferência', Icon: Banknote, color: '#FF9500' },
  { value: 'BOLETO', label: 'Boleto', Icon: FileText, color: '#FF375F' },
  { value: 'DINHEIRO', label: 'Dinheiro', Icon: Wallet, color: '#30B0C7' },
  { value: 'CHEQUE', label: 'Cheque', Icon: FileText, color: '#8E8E93' },
] as const

// ─── Step Indicator ───────────────────────────────────────────────────────────

export function VendaStepIndicator({ currentStep }: { currentStep: VendaStep }) {
  const currentIndex = VENDA_STEPS.indexOf(currentStep)
  return (
    <div className="flex items-center w-full px-5 pb-4">
      {VENDA_STEP_META.map((meta, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={meta.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <motion.div
                className="relative flex h-8 w-8 items-center justify-center rounded-full"
                animate={{
                  backgroundColor: done ? '#34C759' : active ? '#5856D6' : 'rgba(142,142,147,0.12)',
                  scale: active ? 1.08 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {done ? (
                  <CheckCheck className="h-[14px] w-[14px] text-white" />
                ) : (
                  <span
                    className="text-[12px] font-bold leading-none select-none"
                    style={{ color: active ? 'white' : '#8E8E93' }}
                  >
                    {i + 1}
                  </span>
                )}
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: '#5856D6' }}
                    initial={{ opacity: 0.45, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.75 }}
                    transition={{
                      duration: 1.4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeOut',
                    }}
                  />
                )}
              </motion.div>
              <motion.span
                className="text-[9px] font-bold uppercase tracking-[0.07em] whitespace-nowrap"
                animate={{ color: active ? '#5856D6' : done ? '#34C759' : '#8E8E93' }}
                transition={{ duration: 0.2 }}
              >
                {meta.label}
              </motion.span>
            </div>
            {i < VENDA_STEP_META.length - 1 && (
              <div className="flex-1 relative mx-2 mb-5">
                <div
                  className="h-[2px] w-full rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}
                />
                <motion.div
                  className="absolute top-0 left-0 h-[2px] rounded-full"
                  style={{ background: 'linear-gradient(90deg,#5856D6,#34C759)' }}
                  animate={{ width: done ? '100%' : active ? '45%' : '0%' }}
                  transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Valor ────────────────────────────────────────────────────────────
