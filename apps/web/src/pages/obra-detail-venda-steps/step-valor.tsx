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

export function StepValor({
  vendaInput,
  setVendaInput,
  setVendaSplitValor,
  setVendaConta1Valor,
  vendaInputRef,
  custos,
}: {
  vendaInput: string
  setVendaInput: (v: string) => void
  setVendaSplitValor: (v: string) => void
  setVendaConta1Valor: (v: string) => void
  vendaInputRef: React.RefObject<HTMLInputElement>
  custos: ObraCustos | null
}) {
  const costItems = [
    { label: 'Terreno', Icon: Landmark, color: '#AF52DE', value: custos?.valorTerreno ?? 0 },
    { label: 'Burocracia', Icon: FileText, color: '#007AFF', value: custos?.valorBurocracia ?? 0 },
    { label: 'Construção', Icon: Building2, color: '#FF9500', value: custos?.valorConstrucao ?? 0 },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
        >
          <Banknote className="h-[13px] w-[13px] flex-shrink-0" style={{ color: '#34C759' }} />
          <p className="text-[11px] font-semibold tracking-widest" style={{ color: '#8E8E93' }}>
            VALOR DE VENDA
          </p>
        </div>

        <div className="px-5 pt-5 pb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold flex-shrink-0" style={{ color: '#8E8E93' }}>
              R$
            </span>
            <input
              ref={vendaInputRef}
              value={vendaInput}
              onChange={(e) => {
                setVendaInput(formatBRL(e.target.value))
                setVendaSplitValor('')
                setVendaConta1Valor('')
              }}
              placeholder="0,00"
              inputMode="decimal"
              className="flex-1 min-w-0 text-[42px] font-bold tabular-nums tracking-tight outline-none bg-transparent text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-[#48484A] caret-[#5856D6]"
            />
          </div>

          {/* Cost breakdown */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(60,60,67,0.08)' }}>
            <p
              className="text-[10px] font-semibold tracking-widest mb-3"
              style={{ color: '#8E8E93' }}
            >
              CUSTO TOTAL DA OBRA
            </p>
            <div className="space-y-[9px]">
              {costItems.map(({ label, Icon, color, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span
                    className="flex items-center gap-2 text-[13px]"
                    style={{ color: '#8E8E93' }}
                  >
                    <span
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-md flex-shrink-0"
                      style={{ backgroundColor: `${color}18` }}
                    >
                      <Icon className="h-[11px] w-[11px]" style={{ color }} />
                    </span>
                    {label}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-foreground">
                    {formatCurrency(value)}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}
            >
              <span className="text-[14px] font-semibold text-foreground">Total investido</span>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: '#FF3B30' }}>
                {formatCurrency(custos?.total ?? 0)}
              </span>
            </div>
          </div>

          {/* Profit preview */}
          <AnimatePresence>
            {parseCurrency(vendaInput) > 0 && (
              <ObraDetailVendaPreview
                vk={parseCurrency(vendaInput)}
                investido={custos?.total ?? 0}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Shared: ContaRow ─────────────────────────────────────────────────────────
