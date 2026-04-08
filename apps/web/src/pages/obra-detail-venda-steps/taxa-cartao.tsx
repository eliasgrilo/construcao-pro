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

export function TaxaCartao({
  vendaTaxaCartao,
  setVendaTaxaCartao,
  vendaParcelas,
  baseValue,
}: {
  vendaTaxaCartao: string
  setVendaTaxaCartao: (v: string) => void
  vendaParcelas: string
  baseValue: number
}) {
  // Cloud-stored taxa preference
  const { data: cloudTaxa, isSuccess: cloudLoaded } = useUserPreference('taxa_cartao')
  const { mutate: saveTaxaCloud } = useUpdateUserPreference('taxa_cartao')

  const [comJurosMode, setComJurosMode] = useState(false)
  const taxaInputRef = useRef<HTMLInputElement>(null)
  const hasInitialized = useRef(false)
  // Track whether the user explicitly interacted with the taxa controls.
  // Prevents saving empty values when the parent resets vendaTaxaCartao on payment change.
  const userInteracted = useRef(false)

  // On first successful cloud fetch, restore the persisted taxa value.
  // A stored rate like "1.99" means "com juros".  An empty string (or absent)
  // means "sem juros" — the user explicitly chose no interest last time.
  useEffect(() => {
    if (!cloudLoaded || hasInitialized.current) return
    hasInitialized.current = true
    const hasSavedRate = !!cloudTaxa && cloudTaxa !== '' && cloudTaxa !== '0'
    if (hasSavedRate) {
      setVendaTaxaCartao(cloudTaxa)
      setComJurosMode(true)
    }
  }, [cloudLoaded, cloudTaxa, setVendaTaxaCartao])

  // Persist to cloud ONLY on explicit user interaction with taxa controls.
  // "Sem juros" persists as '' (empty string), NOT '0', so re-open doesn't
  // flash incorrectly.
  useEffect(() => {
    if (!hasInitialized.current || !userInteracted.current) return
    const cloudValue = vendaTaxaCartao === '0' ? '' : vendaTaxaCartao
    saveTaxaCloud(cloudValue)
  }, [vendaTaxaCartao, saveTaxaCloud])

  // comJurosMode is the single source of truth for the toggle position.
  // comJuros controls rendering (shows input field + preview when true).
  const comJuros = comJurosMode
  const semJuros = !comJurosMode
  const taxaNum = Number.parseFloat(vendaTaxaCartao || '0')
  const n = Number(vendaParcelas) || 1

  const pmt = taxaNum > 0 && n > 1 ? calcPMT(baseValue, taxaNum, n) : baseValue / (n || 1)
  const totalComJuros = Math.round(pmt * n * 100) / 100
  const jurosTotal = Math.round((totalComJuros - baseValue) * 100) / 100

  const taxaDisplay =
    vendaTaxaCartao !== '' && vendaTaxaCartao !== '0' ? vendaTaxaCartao.replace('.', ',') : ''

  return (
    <div
      className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden"
      style={{ border: '1px solid rgba(255,149,0,0.15)' }}
    >
      <div
        className="px-4 pt-3.5 pb-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
      >
        <span
          className="flex h-[24px] w-[24px] items-center justify-center rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,149,0,0.12)' }}
        >
          <CreditCard className="h-[12px] w-[12px]" style={{ color: '#FF9500' }} />
        </span>
        <p className="text-[11px] font-semibold tracking-wide" style={{ color: '#8E8E93' }}>
          TAXA DO CARTÃO
        </p>
      </div>

      {/* Segmented: Sem juros | Com juros */}
      <div className="px-4 py-3">
        <div className="relative flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
          {(semJuros || comJuros) && (
            <div
              className="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-[8px] shadow-sm pointer-events-none"
              style={{
                background: semJuros ? '#34C759' : '#FF9500',
                transform: comJuros ? 'translateX(calc(100% + 3px))' : 'translateX(0)',
                transition: 'transform 0.28s cubic-bezier(0.25,0.1,0.25,1), background 0.2s',
              }}
            />
          )}
          <button
            type="button"
            onClick={() => {
              userInteracted.current = true
              setComJurosMode(false)
              setVendaTaxaCartao('0')
            }}
            className="relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[10px] text-[13px] font-semibold z-10"
            style={{ color: semJuros ? '#FFFFFF' : '#8E8E93' }}
          >
            <Zap className="h-3.5 w-3.5 flex-shrink-0" />
            Sem juros
          </button>
          <button
            type="button"
            onClick={() => {
              userInteracted.current = true
              setComJurosMode(true)
              if (vendaTaxaCartao === '0' || vendaTaxaCartao === '') setVendaTaxaCartao('')
              setTimeout(() => taxaInputRef.current?.focus(), 50)
            }}
            className="relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[10px] text-[13px] font-semibold z-10"
            style={{ color: comJuros ? '#FFFFFF' : '#8E8E93' }}
          >
            <Percent className="h-3.5 w-3.5 flex-shrink-0" />
            Com juros
          </button>
        </div>
      </div>

      {/* Fee input */}
      <AnimatePresence>
        {comJuros && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}
          >
            <div className="px-4 py-3">
              <p
                className="text-[10px] font-semibold tracking-wide mb-2"
                style={{ color: '#8E8E93' }}
              >
                TAXA MENSAL
              </p>
              <div
                className="flex items-center gap-2 rounded-[12px] px-4 py-3"
                style={{
                  backgroundColor: 'rgba(255,149,0,0.06)',
                  border: '1px solid rgba(255,149,0,0.2)',
                }}
              >
                <input
                  ref={taxaInputRef}
                  type="text"
                  inputMode="decimal"
                  value={taxaDisplay}
                  onChange={(e) => {
                    userInteracted.current = true
                    const raw = e.target.value.replace(',', '.')
                    if (raw === '' || /^\d{0,3}([.]\d{0,2})?$/.test(raw)) {
                      setVendaTaxaCartao(raw === '' ? '' : raw)
                    }
                  }}
                  placeholder="1,99"
                  className="flex-1 text-[26px] font-bold tabular-nums outline-none bg-transparent placeholder:text-[#C7C7CC] min-w-0"
                  style={{ color: '#FF9500', caretColor: '#FF9500' }}
                />
                <span
                  className="text-[14px] font-semibold flex-shrink-0"
                  style={{ color: '#FF9500' }}
                >
                  % ao mês
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview: when parcelas > 1 and taxa chosen */}
      <AnimatePresence>
        {vendaTaxaCartao !== '' && n > 1 && baseValue > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}
          >
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold tracking-wide" style={{ color: '#8E8E93' }}>
                RESUMO
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: '#8E8E93' }}>
                  Valor original
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(baseValue)}
                </span>
              </div>
              {jurosTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: '#FF9500' }}>
                    + Juros totais
                  </span>
                  <span
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: '#FF9500' }}
                  >
                    +{formatCurrency(jurosTotal)}
                  </span>
                </div>
              )}
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}
              >
                <span className="text-[14px] font-semibold text-foreground">
                  {jurosTotal > 0 ? 'Total recebido' : 'Total'}
                </span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: '#34C759' }}>
                  {formatCurrency(totalComJuros)}
                </span>
              </div>
              <div
                className="flex items-center justify-between rounded-[10px] px-3 py-2"
                style={{
                  backgroundColor: jurosTotal > 0 ? 'rgba(255,149,0,0.06)' : 'rgba(52,199,89,0.06)',
                }}
              >
                <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                  Cada parcela ({n}×)
                </span>
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color: jurosTotal > 0 ? '#FF9500' : '#34C759' }}
                >
                  {formatCurrency(Math.round(pmt * 100) / 100)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Step 3: Pagamento ────────────────────────────────────────────────────────
// In split mode: payment applies to Conta 2 only (Conta 1 is always à vista)
// In non-split mode: payment applies to full amount (à vista or parcelado)
