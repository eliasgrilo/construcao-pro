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
import { VENDA_SPLIT_SUM_TOLERANCE, calcPMT } from '../obra-detail-venda-utils'

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

export function ContaRow({
  conta,
  accent,
  isSelected,
  isLast,
  onClick,
}: {
  conta: ContaFinanceira
  accent: string
  isSelected: boolean
  isLast: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3.5 transition-colors text-left',
        !isLast && 'border-b border-black/[0.05] dark:border-white/[0.05]',
      )}
      style={{ backgroundColor: isSelected ? 'rgba(88,86,214,0.05)' : undefined }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Wallet className="h-4 w-4" style={{ color: accent }} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">{conta.banco}</p>
        {(conta.agencia || conta.numero_conta) && (
          <p className="text-[12px] truncate" style={{ color: '#8E8E93' }}>
            {[
              conta.agencia && `Ag. ${conta.agencia}`,
              conta.numero_conta && `CC. ${conta.numero_conta}`,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        )}
      </div>
      <AnimatePresence>
        {isSelected && (
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
  )
}

// ─── Shared: Subconta segmented ───────────────────────────────────────────────

export function SubcontaSegmented({
  vendaSubconta,
  setVendaSubconta,
}: {
  vendaSubconta: 'CAIXA' | 'APLICACAO' | 'APLICADO'
  setVendaSubconta: (v: 'CAIXA' | 'APLICACAO' | 'APLICADO') => void
}) {
  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}>
      <p className="text-[10px] font-semibold tracking-wide mb-2" style={{ color: '#8E8E93' }}>
        DESTINO NA CONTA
      </p>
      <div className="relative flex gap-0.5 p-[3px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08]">
        <div
          className="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-white dark:bg-[#3A3A3C] rounded-[8px] shadow-sm pointer-events-none"
          style={{
            transform:
              vendaSubconta === 'APLICADO' ? 'translateX(calc(100% + 3px))' : 'translateX(0)',
            transition: 'transform 0.28s cubic-bezier(0.25,0.1,0.25,1)',
          }}
        />
        <button
          type="button"
          onClick={() => setVendaSubconta('CAIXA')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[8px] text-[13px] font-medium z-10',
            vendaSubconta !== 'CAIXA' && 'text-foreground/40',
          )}
          style={{ color: vendaSubconta === 'CAIXA' ? '#34C759' : undefined }}
        >
          <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
          Em Caixa
        </button>
        <button
          type="button"
          onClick={() => setVendaSubconta('APLICADO')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-[8px] text-[13px] font-medium z-10',
            vendaSubconta !== 'APLICADO' && 'text-foreground/40',
          )}
          style={{ color: vendaSubconta === 'APLICADO' ? '#5856D6' : undefined }}
        >
          <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
          Aplicações
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Destino ──────────────────────────────────────────────────────────
// Split mode: Conta 1 always à vista + Conta 2 for installments
// Non-split: single account + subconta choice

export function StepDestino({
  contasFinanceiras,
  vendaInput,
  vendaContaId,
  setVendaContaId,
  vendaSubconta,
  setVendaSubconta,
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
}: {
  contasFinanceiras: ContaFinanceira[]
  vendaInput: string
  vendaContaId: string
  setVendaContaId: (v: string) => void
  vendaSubconta: 'CAIXA' | 'APLICACAO' | 'APLICADO'
  setVendaSubconta: (v: 'CAIXA' | 'APLICACAO' | 'APLICADO') => void
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
}) {
  const vendaVal = parseCurrency(vendaInput)
  const c2v = parseCurrency(vendaSplitValor)
  const c1v = parseCurrency(vendaConta1Valor)
  const splitSumOk =
    c1v > 0 && c2v > 0 && Math.abs(c1v + c2v - vendaVal) < VENDA_SPLIT_SUM_TOLERANCE

  return (
    <div className="space-y-3">
      {/* Split toggle */}
      <button
        type="button"
        onClick={() => {
          const next = !vendaSplitEnabled
          setVendaSplitEnabled(next)
          if (!next) {
            setVendaSplitContaId('')
            setVendaSplitValor('')
            setVendaConta1Valor('')
          }
        }}
        className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-[#2C2C2E] px-4 py-4 transition-colors"
        style={{ backgroundColor: vendaSplitEnabled ? 'rgba(88,86,214,0.05)' : undefined }}
      >
        <div className="flex-1 text-left">
          <p className="text-[15px] font-medium">Dividir valor entre contas</p>
          <p className="text-[12px]" style={{ color: '#8E8E93' }}>
            Conta 1 à vista · Conta 2 com forma de pagamento
          </p>
        </div>
        <div
          className="flex h-[31px] w-[51px] items-center rounded-full px-0.5 flex-shrink-0"
          style={{
            backgroundColor: vendaSplitEnabled ? '#34C759' : 'rgba(120,120,128,0.16)',
            transition: 'background-color 0.25s',
          }}
        >
          <motion.div
            className="h-[27px] w-[27px] rounded-full bg-white shadow-sm"
            animate={{ x: vendaSplitEnabled ? 19 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        </div>
      </button>

      <AnimatePresence mode="wait">
        {vendaSplitEnabled ? (
          /* ── SPLIT MODE ── */
          <motion.div
            key="split"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Conta 1 — always à vista */}
            <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <span
                  className="flex h-[20px] w-[20px] items-center justify-center rounded-md flex-shrink-0"
                  style={{ backgroundColor: 'rgba(52,199,89,0.12)' }}
                >
                  <Banknote className="h-[11px] w-[11px]" style={{ color: '#34C759' }} />
                </span>
                <div>
                  <p
                    className="text-[11px] font-semibold tracking-wide"
                    style={{ color: '#8E8E93' }}
                  >
                    CONTA 1 — SEMPRE À VISTA
                  </p>
                </div>
              </div>

              {contasFinanceiras.length === 0 ? (
                <p className="px-4 pb-4 text-[13px]" style={{ color: '#8E8E93' }}>
                  Nenhuma conta cadastrada
                </p>
              ) : (
                contasFinanceiras.map((conta, i) => (
                  <ContaRow
                    key={conta.id}
                    conta={conta}
                    accent={ACCENT_COLORS[i % 6]}
                    isSelected={vendaContaId === conta.id}
                    isLast={i === contasFinanceiras.length - 1}
                    onClick={() => {
                      setVendaContaId(conta.id)
                      if (conta.id === vendaSplitContaId) setVendaSplitContaId('')
                    }}
                  />
                ))
              )}

              {/* Subconta only for Conta 1 in split mode */}
              {vendaContaId && (
                <SubcontaSegmented
                  vendaSubconta={vendaSubconta}
                  setVendaSubconta={setVendaSubconta}
                />
              )}

              {/* Data do pagamento */}
              {vendaContaId && (
                <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}>
                  <p
                    className="text-[10px] font-semibold tracking-wide mb-2"
                    style={{ color: '#8E8E93' }}
                  >
                    DATA DO PAGAMENTO
                  </p>
                  <input
                    type="date"
                    value={vendaDataPagamento}
                    onChange={(e) => setVendaDataPagamento(e.target.value)}
                    className="w-full rounded-[10px] px-3 py-2.5 text-[15px] font-medium bg-black/[0.04] dark:bg-white/[0.06] outline-none text-foreground"
                  />
                </div>
              )}

              {/* Auto-calculated Conta 1 value */}
              {vendaContaId && vendaVal > 0 && (
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}
                >
                  <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                    Conta 1 recebe (à vista)
                  </span>
                  <span
                    className="text-[13px] font-bold tabular-nums"
                    style={{ color: c1v > 0 ? '#34C759' : '#8E8E93' }}
                  >
                    {c1v > 0 ? formatCurrency(c1v) : c2v > 0 ? '—' : formatCurrency(vendaVal)}
                  </span>
                </div>
              )}
            </div>

            {/* Conta 2 */}
            <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <span
                  className="flex h-[20px] w-[20px] items-center justify-center rounded-md flex-shrink-0"
                  style={{ backgroundColor: 'rgba(88,86,214,0.1)' }}
                >
                  <CreditCard className="h-[11px] w-[11px]" style={{ color: '#5856D6' }} />
                </span>
                <div>
                  <p
                    className="text-[11px] font-semibold tracking-wide"
                    style={{ color: '#8E8E93' }}
                  >
                    CONTA 2 — FORMA DE PAGAMENTO
                  </p>
                </div>
              </div>

              {contasFinanceiras.filter((c) => c.id !== vendaContaId).length === 0 ? (
                <p className="px-4 pb-4 text-[13px]" style={{ color: '#8E8E93' }}>
                  Selecione a Conta 1 primeiro ou cadastre mais contas
                </p>
              ) : (
                (() => {
                  const filtered = contasFinanceiras.filter((c) => c.id !== vendaContaId)
                  return filtered.map((conta, i) => {
                    const origIdx = contasFinanceiras.indexOf(conta)
                    return (
                      <ContaRow
                        key={conta.id}
                        conta={conta}
                        accent={ACCENT_COLORS[origIdx % 6]}
                        isSelected={vendaSplitContaId === conta.id}
                        isLast={i === filtered.length - 1}
                        onClick={() => setVendaSplitContaId(conta.id)}
                      />
                    )
                  })
                })()
              )}

              {/* Conta 2 value input */}
              {vendaSplitContaId && vendaVal > 0 && (
                <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}>
                  <p
                    className="text-[10px] font-semibold tracking-wide mb-1.5"
                    style={{ color: '#8E8E93' }}
                  >
                    VALOR PARA CONTA 2
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[17px] font-semibold" style={{ color: '#8E8E93' }}>
                      R$
                    </span>
                    <input
                      value={vendaSplitValor}
                      onChange={(e) => {
                        const f = formatBRL(e.target.value)
                        setVendaSplitValor(f)
                        const v2 = parseCurrency(f)
                        setVendaConta1Valor(
                          v2 > 0 && v2 < vendaVal
                            ? formatBRL(String(Math.round((vendaVal - v2) * 100) / 100))
                            : '',
                        )
                      }}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="flex-1 text-[28px] font-bold tabular-nums outline-none bg-transparent text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] caret-[#5856D6]"
                    />
                  </div>

                  {c2v >= vendaVal && c2v > 0 && (
                    <p className="text-[12px] mt-1" style={{ color: '#FF3B30' }}>
                      Valor da Conta 2 não pode ser igual ou maior que o total
                    </p>
                  )}

                  {/* Sum validation */}
                  {c1v > 0 && c2v > 0 && (
                    <div
                      className="mt-2 pt-2 space-y-1.5"
                      style={{ borderTop: '1px solid rgba(60,60,67,0.06)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                          Conta 1 (à vista)
                        </span>
                        <span
                          className="text-[12px] font-semibold tabular-nums"
                          style={{ color: '#34C759' }}
                        >
                          {formatCurrency(c1v)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: '#8E8E93' }}>
                          Conta 2
                        </span>
                        <span
                          className="text-[12px] font-semibold tabular-nums"
                          style={{ color: '#5856D6' }}
                        >
                          {formatCurrency(c2v)}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between pt-1"
                        style={{ borderTop: '1px solid rgba(60,60,67,0.06)' }}
                      >
                        <span className="text-[12px] font-semibold" style={{ color: '#8E8E93' }}>
                          Total distribuído
                        </span>
                        <span
                          className="text-[12px] font-bold tabular-nums"
                          style={{ color: splitSumOk ? '#34C759' : '#FF9500' }}
                        >
                          {formatCurrency(c1v + c2v)} / {formatCurrency(vendaVal)}
                          {splitSumOk && ' ✓'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── SINGLE ACCOUNT MODE ── */
          <motion.div
            key="single"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2">
              <p className="text-[11px] font-semibold tracking-wide" style={{ color: '#8E8E93' }}>
                CONTA DE DESTINO
              </p>
            </div>
            {contasFinanceiras.length === 0 ? (
              <div className="flex items-center gap-3 px-4 pb-4">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: '#8E8E9314' }}
                >
                  <Wallet className="h-4 w-4" style={{ color: '#8E8E93' }} />
                </span>
                <p className="text-[13px]" style={{ color: '#8E8E93' }}>
                  Nenhuma conta cadastrada
                </p>
              </div>
            ) : (
              contasFinanceiras.map((conta, i) => (
                <ContaRow
                  key={conta.id}
                  conta={conta}
                  accent={ACCENT_COLORS[i % 6]}
                  isSelected={vendaContaId === conta.id}
                  isLast={i === contasFinanceiras.length - 1}
                  onClick={() => setVendaContaId(conta.id)}
                />
              ))
            )}
            {vendaContaId && (
              <SubcontaSegmented
                vendaSubconta={vendaSubconta}
                setVendaSubconta={setVendaSubconta}
              />
            )}
            {/* Data do pagamento */}
            {vendaContaId && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(60,60,67,0.07)' }}>
                <p
                  className="text-[10px] font-semibold tracking-wide mb-2"
                  style={{ color: '#8E8E93' }}
                >
                  DATA DO PAGAMENTO
                </p>
                <input
                  type="date"
                  value={vendaDataPagamento}
                  onChange={(e) => setVendaDataPagamento(e.target.value)}
                  className="w-full rounded-[10px] px-3 py-2.5 text-[15px] font-medium bg-black/[0.04] dark:bg-white/[0.06] outline-none text-foreground"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Taxa do Cartão (credit card fee) ────────────────────────────────────────
