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
import { addMonthsClamped, calcPMT } from '../obra-detail-venda-utils'
import { TaxaCartao } from './taxa-cartao'

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

export function StepPagamento({
  vendaSplitEnabled,
  vendaInput,
  vendaSplitValor,
  vendaFormaPagamento,
  setVendaFormaPagamento,
  vendaParcelas,
  setVendaParcelas,
  vendaTaxaCartao,
  setVendaTaxaCartao,
  vendaDataPrimeiraParcela,
  setVendaDataPrimeiraParcela,
  // For summary card
  vendaContaId,
  vendaSubconta,
  vendaConta1Valor,
  contasFinanceiras,
  custos,
}: {
  vendaSplitEnabled: boolean
  vendaInput: string
  vendaSplitValor: string
  vendaFormaPagamento: string
  setVendaFormaPagamento: (v: string) => void
  vendaParcelas: string
  setVendaParcelas: (v: string) => void
  vendaTaxaCartao: string
  setVendaTaxaCartao: (v: string) => void
  vendaDataPrimeiraParcela: string
  setVendaDataPrimeiraParcela: (v: string) => void
  vendaContaId: string
  vendaSubconta: 'CAIXA' | 'APLICACAO' | 'APLICADO'
  vendaConta1Valor: string
  contasFinanceiras: ContaFinanceira[]
  custos: ObraCustos | null
}) {
  const vendaVal = parseCurrency(vendaInput)

  // Base for installment calculations:
  // - Split mode: installments apply to Conta 2 value
  // - Non-split: full amount
  const baseParc =
    vendaSplitEnabled && parseCurrency(vendaSplitValor) > 0
      ? parseCurrency(vendaSplitValor)
      : vendaVal

  const taxaNum = Number.parseFloat(vendaTaxaCartao || '0')
  const nParcelas = Number(vendaParcelas) || 1

  // PMT for summary card — calcPMT handles ratePercent=0 via simple division
  const pmt = Math.round(calcPMT(baseParc, taxaNum, nParcelas) * 100) / 100

  const totalComJuros = Math.round(pmt * nParcelas * 100) / 100
  const conta1Obj = contasFinanceiras.find((c) => c.id === vendaContaId)

  // Lucro estimated (based on total received)
  const totalRecebido = vendaSplitEnabled
    ? parseCurrency(vendaConta1Valor) + totalComJuros
    : totalComJuros > 0 && vendaFormaPagamento === 'CARTAO_CREDITO' && taxaNum > 0 && nParcelas > 1
      ? totalComJuros
      : vendaVal
  const lucro = totalRecebido - (custos?.total ?? 0)
  const isLucroPos = Math.round(lucro * 100) / 100 >= 0

  const paymentOptObj = PAYMENT_OPTIONS.find((p) => p.value === vendaFormaPagamento)

  return (
    <div className="space-y-3">
      {/* Context banner for split mode */}
      {vendaSplitEnabled && (
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: 'rgba(52,199,89,0.07)',
            border: '1px solid rgba(52,199,89,0.2)',
          }}
        >
          <span
            className="flex h-[32px] w-[32px] items-center justify-center rounded-xl flex-shrink-0"
            style={{ backgroundColor: 'rgba(52,199,89,0.12)' }}
          >
            <Check className="h-[15px] w-[15px]" style={{ color: '#34C759' }} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: '#34C759' }}>
              Conta 1 já recebe à vista
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#8E8E93' }}>
              {parseCurrency(vendaConta1Valor) > 0
                ? `${formatCurrency(parseCurrency(vendaConta1Valor))} · Pagamento abaixo = Conta 2`
                : 'A forma de pagamento abaixo aplica-se à Conta 2'}
            </p>
          </div>
        </div>
      )}

      {/* Payment method list */}
      <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
        <div
          className="px-4 pt-4 pb-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
        >
          <span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'rgba(88,86,214,0.1)' }}
          >
            <CreditCard className="h-[13px] w-[13px]" style={{ color: '#5856D6' }} />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-wide" style={{ color: '#8E8E93' }}>
              {vendaSplitEnabled ? 'CONTA 2 — PAGAMENTO' : 'FORMA DE PAGAMENTO'}
            </p>
          </div>
        </div>

        {PAYMENT_OPTIONS.map(({ value, label, Icon, color }, i) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setVendaFormaPagamento(value)
              if (value !== 'CARTAO_CREDITO' && value !== 'BOLETO') {
                setVendaParcelas('')
                setVendaTaxaCartao('')
              }
              if (value !== 'CARTAO_CREDITO') {
                setVendaTaxaCartao('')
              }
              if (value === 'BOLETO' && !vendaParcelas) {
                setVendaParcelas('1')
              }
            }}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-[14px] transition-colors',
              i > 0 && 'border-t border-black/[0.05] dark:border-white/[0.05]',
            )}
            style={{ backgroundColor: vendaFormaPagamento === value ? `${color}08` : undefined }}
          >
            <span
              className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] flex-shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-[17px] w-[17px]" style={{ color }} />
            </span>
            <span className="flex-1 text-[15px] text-left font-medium">{label}</span>
            <AnimatePresence>
              {vendaFormaPagamento === value && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                >
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#5856D6' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* Credit card sections (taxa + parcelas) */}
      <AnimatePresence>
        {vendaFormaPagamento === 'CARTAO_CREDITO' && (
          <motion.div
            key="cc"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-3 overflow-hidden"
          >
            <TaxaCartao
              vendaTaxaCartao={vendaTaxaCartao}
              setVendaTaxaCartao={setVendaTaxaCartao}
              vendaParcelas={vendaParcelas}
              baseValue={baseParc}
            />

            {/* Parcelas — only after taxa chosen */}
            <AnimatePresence>
              {vendaTaxaCartao !== '' && (
                <motion.div
                  key="parcelas"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden"
                >
                  <div
                    className="px-4 pt-4 pb-3 flex items-center gap-2"
                    style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
                  >
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: 'rgba(88,86,214,0.1)' }}
                    >
                      <Percent className="h-[13px] w-[13px]" style={{ color: '#5856D6' }} />
                    </span>
                    <div>
                      <p
                        className="text-[11px] font-semibold tracking-wide"
                        style={{ color: '#8E8E93' }}
                      >
                        NÚMERO DE PARCELAS
                      </p>
                      {vendaSplitEnabled && baseParc > 0 && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#8E8E93' }}>
                          Base: {formatCurrency(baseParc)} (Conta 2)
                        </p>
                      )}
                    </div>
                  </div>

                  {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => {
                    const pmtN =
                      taxaNum > 0 && n > 1
                        ? Math.round(calcPMT(baseParc, taxaNum, n) * 100) / 100
                        : baseParc > 0
                          ? Math.round((baseParc / n) * 100) / 100
                          : 0
                    const totalN = Math.round(pmtN * n * 100) / 100
                    const juros = Math.round((totalN - baseParc) * 100) / 100
                    const isSelected = vendaParcelas === String(n)

                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setVendaParcelas(String(n))}
                        className="flex items-center gap-3 w-full px-4 py-3.5 transition-colors border-t border-black/[0.05] dark:border-white/[0.05]"
                        style={{
                          backgroundColor: isSelected ? 'rgba(88,86,214,0.05)' : undefined,
                        }}
                      >
                        <span
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold flex-shrink-0 transition-colors"
                          style={{
                            backgroundColor: isSelected ? '#5856D6' : 'rgba(120,120,128,0.1)',
                            color: isSelected ? '#FFFFFF' : '#8E8E93',
                          }}
                        >
                          {n}
                        </span>
                        <div className="flex-1 text-left">
                          <span className="text-[15px] font-medium">
                            {n}×
                            {pmtN > 0 && (
                              <span className="font-normal text-muted-foreground">
                                {' '}
                                de{' '}
                                <span
                                  className="font-semibold dark:text-white"
                                  style={{ color: juros > 0 ? '#FF9500' : '#1C1C1E' }}
                                >
                                  {formatCurrency(pmtN)}
                                </span>
                              </span>
                            )}
                          </span>
                          {juros > 0 && n > 1 && baseParc > 0 && (
                            <p className="text-[11px] mt-0.5" style={{ color: '#FF9500' }}>
                              +{formatCurrency(juros)} em juros
                            </p>
                          )}
                        </div>
                        {pmtN > 0 && n > 1 && baseParc > 0 && (
                          <span
                            className="text-[11px] tabular-nums text-right"
                            style={{ color: juros > 0 ? '#FF9500' : '#8E8E93' }}
                          >
                            Total {formatCurrency(totalN)}
                          </span>
                        )}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                          >
                            <Check
                              className="h-4 w-4 flex-shrink-0 ml-1"
                              style={{ color: '#5856D6' }}
                            />
                          </motion.div>
                        )}
                      </button>
                    )
                  })}

                  {/* Deposit schedule preview */}
                  {vendaParcelas &&
                    Number(vendaParcelas) > 1 &&
                    baseParc > 0 &&
                    (() => {
                      const n = Number(vendaParcelas)
                      const pmtSched =
                        taxaNum > 0
                          ? Math.round(calcPMT(baseParc, taxaNum, n) * 100) / 100
                          : Math.round((baseParc / n) * 100) / 100
                      const baseDate = vendaDataPrimeiraParcela
                        ? new Date(`${vendaDataPrimeiraParcela}T12:00:00`)
                        : new Date()
                      return (
                        <div
                          className="px-4 py-3"
                          style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}
                        >
                          <p
                            className="text-[10px] font-semibold tracking-wide mb-2"
                            style={{ color: '#8E8E93' }}
                          >
                            CRONOGRAMA DE DEPÓSITOS
                          </p>
                          {Array.from({ length: Math.min(n, 3) }, (_, i) => {
                            const d = addMonthsClamped(baseDate, i)
                            return (
                              <div key={i} className="flex items-center justify-between py-1.5">
                                <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                                  {i + 1}ª parcela ·{' '}
                                  {d.toLocaleDateString('pt-BR', {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span
                                  className="text-[12px] font-semibold tabular-nums"
                                  style={{ color: '#34C759' }}
                                >
                                  +{formatCurrency(pmtSched)}
                                </span>
                              </div>
                            )
                          })}
                          {n > 3 && (
                            <p
                              className="text-[11px] text-center pt-1"
                              style={{ color: '#8E8E93' }}
                            >
                              +{n - 3} parcelas restantes
                            </p>
                          )}
                        </div>
                      )
                    })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* First installment date — shown for any parcelas count */}
            <AnimatePresence>
              {vendaFormaPagamento === 'CARTAO_CREDITO' &&
                vendaParcelas &&
                Number(vendaParcelas) >= 1 && (
                  <motion.div
                    key="data-parcela"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden"
                  >
                    <div
                      className="px-4 pt-3.5 pb-3 flex items-center gap-2"
                      style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
                    >
                      <span
                        className="flex h-[24px] w-[24px] items-center justify-center rounded-lg flex-shrink-0"
                        style={{ backgroundColor: 'rgba(0,122,255,0.1)' }}
                      >
                        <CalendarDays className="h-[12px] w-[12px]" style={{ color: '#007AFF' }} />
                      </span>
                      <p
                        className="text-[11px] font-semibold tracking-wide"
                        style={{ color: '#8E8E93' }}
                      >
                        {Number(vendaParcelas) > 1 ? 'DATA DA 1ª PARCELA' : 'DATA DE PAGAMENTO'}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <input
                        type="date"
                        value={vendaDataPrimeiraParcela}
                        onChange={(e) => setVendaDataPrimeiraParcela(e.target.value)}
                        className="w-full rounded-[10px] px-3 py-2.5 text-[15px] font-medium bg-black/[0.04] dark:bg-white/[0.06] outline-none text-foreground"
                      />
                      {Number(vendaParcelas) > 1 && (
                        <p className="text-[11px] mt-2" style={{ color: '#8E8E93' }}>
                          As parcelas seguintes serão geradas mensalmente a partir desta data
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOLETO sections (parcelas + vencimento) ── */}
      <AnimatePresence>
        {vendaFormaPagamento === 'BOLETO' && (
          <motion.div
            key="boleto"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Parcelas picker */}
            <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
              <div
                className="px-4 pt-4 pb-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
              >
                <span
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'rgba(255,55,95,0.1)' }}
                >
                  <FileText className="h-[13px] w-[13px]" style={{ color: '#FF375F' }} />
                </span>
                <p className="text-[11px] font-semibold tracking-wide" style={{ color: '#8E8E93' }}>
                  NÚMERO DE BOLETOS
                </p>
              </div>

              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                const pmtN = baseParc > 0 ? Math.round((baseParc / n) * 100) / 100 : 0
                const isSelected = vendaParcelas === String(n)

                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVendaParcelas(String(n))}
                    className="flex items-center gap-3 w-full px-4 py-3.5 transition-colors border-t border-black/[0.05] dark:border-white/[0.05]"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,55,95,0.05)' : undefined,
                    }}
                  >
                    <span
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold flex-shrink-0 transition-colors"
                      style={{
                        backgroundColor: isSelected ? '#FF375F' : 'rgba(120,120,128,0.1)',
                        color: isSelected ? '#FFFFFF' : '#8E8E93',
                      }}
                    >
                      {n}
                    </span>
                    <div className="flex-1 text-left">
                      <span className="text-[15px] font-medium">
                        {n === 1 ? 'À vista' : `${n}×`}
                        {n > 1 && pmtN > 0 && (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            de{' '}
                            <span className="font-semibold dark:text-white text-[#1C1C1E]">
                              {formatCurrency(pmtN)}
                            </span>
                          </span>
                        )}
                      </span>
                      {n === 1 && pmtN > 0 && (
                        <p className="text-[11px] mt-0.5 text-muted-foreground">
                          {formatCurrency(pmtN)} · boleto único
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                      >
                        <Check
                          className="h-4 w-4 flex-shrink-0 ml-1"
                          style={{ color: '#FF375F' }}
                        />
                      </motion.div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Vencimento do 1º boleto */}
            <AnimatePresence>
              {vendaParcelas && Number(vendaParcelas) >= 1 && (
                <motion.div
                  key="boleto-data"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden"
                >
                  <div
                    className="px-4 pt-3.5 pb-3 flex items-center gap-2"
                    style={{ borderBottom: '1px solid rgba(60,60,67,0.07)' }}
                  >
                    <span
                      className="flex h-[24px] w-[24px] items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: 'rgba(255,55,95,0.1)' }}
                    >
                      <CalendarDays className="h-[12px] w-[12px]" style={{ color: '#FF375F' }} />
                    </span>
                    <p
                      className="text-[11px] font-semibold tracking-wide"
                      style={{ color: '#8E8E93' }}
                    >
                      {Number(vendaParcelas) > 1 ? 'VENCIMENTO DO 1º BOLETO' : 'DATA DE VENCIMENTO'}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <input
                      type="date"
                      value={vendaDataPrimeiraParcela}
                      onChange={(e) => setVendaDataPrimeiraParcela(e.target.value)}
                      className="w-full rounded-[10px] px-3 py-2.5 text-[15px] font-medium bg-black/[0.04] dark:bg-white/[0.06] outline-none text-foreground"
                    />
                    {Number(vendaParcelas) > 1 && (
                      <p className="text-[11px] mt-2" style={{ color: '#8E8E93' }}>
                        Os boletos seguintes vencem mensalmente a partir desta data
                      </p>
                    )}
                  </div>

                  {/* Cronograma boletos */}
                  {Number(vendaParcelas) > 1 &&
                    vendaDataPrimeiraParcela &&
                    baseParc > 0 &&
                    (() => {
                      const n = Number(vendaParcelas)
                      const pmtSched = Math.round((baseParc / n) * 100) / 100
                      const baseDate = new Date(`${vendaDataPrimeiraParcela}T12:00:00`)
                      return (
                        <div
                          className="px-4 pb-3"
                          style={{ borderTop: '1px solid rgba(60,60,67,0.07)', paddingTop: '12px' }}
                        >
                          <p
                            className="text-[10px] font-semibold tracking-wide mb-2"
                            style={{ color: '#8E8E93' }}
                          >
                            CRONOGRAMA DE BOLETOS
                          </p>
                          {Array.from({ length: Math.min(n, 3) }, (_, i) => {
                            const d = addMonthsClamped(baseDate, i)
                            return (
                              <div key={i} className="flex items-center justify-between py-1.5">
                                <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                                  {i + 1}º boleto ·{' '}
                                  {d.toLocaleDateString('pt-BR', {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span
                                  className="text-[12px] font-semibold tabular-nums"
                                  style={{ color: '#FF375F' }}
                                >
                                  {formatCurrency(pmtSched)}
                                </span>
                              </div>
                            )
                          })}
                          {n > 3 && (
                            <p
                              className="text-[11px] text-center pt-1"
                              style={{ color: '#8E8E93' }}
                            >
                              +{n - 3} boletos restantes
                            </p>
                          )}
                        </div>
                      )
                    })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary card — shown when payment is set ── */}
      <AnimatePresence>
        {vendaFormaPagamento && vendaContaId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(88,86,214,0.06) 0%, rgba(175,82,222,0.04) 100%)',
              border: '1px solid rgba(88,86,214,0.15)',
            }}
          >
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(88,86,214,0.08)' }}
            >
              <Sparkles className="h-[13px] w-[13px]" style={{ color: '#5856D6' }} />
              <p className="text-[11px] font-semibold tracking-wide" style={{ color: '#5856D6' }}>
                RESUMO DA VENDA
              </p>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              {/* Valor de venda */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px]" style={{ color: '#8E8E93' }}>
                  <Banknote className="h-[13px] w-[13px]" />
                  Valor de venda
                </span>
                <span className="text-[13px] font-bold tabular-nums text-foreground">
                  {formatCurrency(vendaVal)}
                </span>
              </div>

              {/* Payment */}
              {paymentOptObj && (
                <div className="flex items-center justify-between">
                  <span
                    className="flex items-center gap-2 text-[13px]"
                    style={{ color: '#8E8E93' }}
                  >
                    <paymentOptObj.Icon className="h-[13px] w-[13px]" />
                    {vendaSplitEnabled ? 'Conta 2' : paymentOptObj.label}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {nParcelas > 1
                      ? `${nParcelas}× de ${formatCurrency(Math.round(pmt * 100) / 100)}`
                      : vendaFormaPagamento === 'BOLETO' && vendaParcelas === '1'
                        ? 'Boleto à vista'
                        : 'À vista'}
                  </span>
                </div>
              )}

              {/* Total com juros */}
              {vendaFormaPagamento === 'CARTAO_CREDITO' && nParcelas > 1 && taxaNum > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: '#FF9500' }}>
                    Total {vendaSplitEnabled ? 'Conta 2' : ''} com juros
                  </span>
                  <span
                    className="text-[12px] font-semibold tabular-nums"
                    style={{ color: '#FF9500' }}
                  >
                    {formatCurrency(totalComJuros)}
                  </span>
                </div>
              )}

              {/* Account */}
              {conta1Obj && (
                <div className="flex items-center justify-between">
                  <span
                    className="flex items-center gap-2 text-[13px]"
                    style={{ color: '#8E8E93' }}
                  >
                    <Wallet className="h-[13px] w-[13px]" />
                    {vendaSplitEnabled ? 'Conta 1 (à vista)' : 'Conta'}
                  </span>
                  <span className="text-[13px] font-semibold text-foreground truncate max-w-[140px] text-right">
                    {conta1Obj.banco}
                  </span>
                </div>
              )}

              {/* Subconta */}
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                  {vendaSplitEnabled ? 'Destino Conta 1' : 'Destino'}
                </span>
                <span className="text-[12px] font-semibold text-foreground">
                  {vendaSubconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações'}
                </span>
              </div>

              {/* Lucro */}
              <div
                className="flex items-center justify-between pt-2.5"
                style={{ borderTop: '1px solid rgba(88,86,214,0.1)' }}
              >
                <span
                  className="flex items-center gap-2 text-[13px] font-semibold"
                  style={{ color: isLucroPos ? '#34C759' : '#FF3B30' }}
                >
                  <TrendingUp className="h-[13px] w-[13px]" />
                  Lucro estimado
                </span>
                <span
                  className="text-[14px] font-bold tabular-nums"
                  style={{ color: isLucroPos ? '#34C759' : '#FF3B30' }}
                >
                  {isLucroPos ? '+' : ''}
                  {formatCurrency(lucro)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Step slide variants ──────────────────────────────────────────────────────

export const stepVariants = {
  enter: (dir: number) => ({
    x: dir * 30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: (dir: number) => ({
    x: dir * -30,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  }),
}
