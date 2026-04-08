import { Button } from '@/components/ui/button'
import { formatBRL, parseCurrency } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import { useFormDraft } from '@/hooks/use-form-draft'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useFinanceiroContas,
  useFinanceiroMovimentacoes,
  useRegisterFinanceiroMovement,
  useReverseFinanceiroMovement,
} from '@/hooks/use-supabase'
import { useUndoableDelete } from '@/hooks/use-undoable-delete'
import { type CreateMovimentacaoInput, createMovimentacaoSchema } from '@/lib/schemas'
import { accents, cn, formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DestinoCard, Ring } from './conta-detail-components'

/* ─── Types ─── */
interface Conta {
  id: string
  banco: string
  agencia: string
  numeroConta: string
  valorCaixa: number
  valorAplicado: number
}

type TipoMov = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

interface MovimentacaoConta {
  id: string
  tipo: TipoMov
  subconta: 'CAIXA' | 'APLICADO'
  motivo: string
  valor: number
  data: string
  createdAt: string
  /** null = troca interna Caixa↔Aplicado · contaId = outra conta cadastrada */
  transferenciaDestinoId?: string
}

export const SUBCONTA_LABEL: Record<'CAIXA' | 'APLICADO', string> = {
  CAIXA: 'Em Caixa',
  APLICADO: 'Aplicações',
}

import { NovaMovimentacaoDialog, computeMovDeltas } from './conta-detail-movimentacao-form'

// Ring, SegBtn, DestinoCard → extraídos para conta-detail-components.tsx

/* ══════════════════════════════ */
export function ContaDetailPage() {
  const { contaId } = useParams({ strict: false }) as { contaId: string }
  const navigate = useNavigate()
  const { toast } = useToast()
  const { canManageFinanceiro } = usePermissions()

  /* ─── Supabase State ─── */
  const { data: dbContas = [], isLoading: isLoadingContas } = useFinanceiroContas()
  const contasAll: Conta[] = useMemo(
    () =>
      dbContas.map(
        (c: {
          id: string
          banco: string
          agencia: string
          numero_conta: string
          valor_caixa: number
          valor_aplicado: number
        }) => ({
          id: c.id,
          banco: c.banco,
          agencia: c.agencia,
          numeroConta: c.numero_conta,
          valorCaixa: c.valor_caixa,
          valorAplicado: c.valor_aplicado,
        }),
      ),
    [dbContas],
  )

  const { data: dbMovs = [] } = useFinanceiroMovimentacoes(contaId)
  const movs: MovimentacaoConta[] = useMemo(
    () =>
      dbMovs.map(
        (m: {
          id: string
          tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
          subconta: 'CAIXA' | 'APLICADO'
          motivo: string
          valor: number
          data: string
          transferencia_destino_id: string | null
          created_at: string
        }) => ({
          id: m.id,
          tipo: m.tipo,
          subconta: m.subconta,
          motivo: m.motivo,
          valor: m.valor,
          data: m.data,
          createdAt: m.created_at,
          transferenciaDestinoId: m.transferencia_destino_id || undefined,
        }),
      ),
    [dbMovs],
  )

  const registerMovement = useRegisterFinanceiroMovement()
  const reverseMovement = useReverseFinanceiroMovement()

  const { deleteWithUndo: deleteMovWithUndo } = useUndoableDelete<string>(
    async (movId: string) => {
      const mov = movs.find((item) => item.id === movId)
      if (!mov) throw new Error('Movimentação não encontrada')

      // Compute the original deltas and reverse them atomically in one DB transaction.
      const deltas = computeMovDeltas(
        mov.tipo,
        mov.subconta,
        mov.valor,
        mov.transferenciaDestinoId ?? null,
        contasAll,
      )
      await reverseMovement.mutateAsync({
        mov_id: mov.id,
        conta_id: contaId,
        delta_caixa: deltas.delta_caixa,
        delta_aplicado: deltas.delta_aplicado,
        destino_conta_id: deltas.destino_conta_id,
        delta_destino_caixa: deltas.delta_destino_caixa,
      })
    },
    {
      pending: 'Movimentação será excluída em 5 segundos',
      undone: 'Exclusão cancelada',
      error: 'Erro ao excluir movimentação',
    },
  )

  const conta = useMemo(() => contasAll.find((c) => c.id === contaId), [contasAll, contaId])
  const accentIdx = useMemo(() => {
    if (!conta) return 0
    return contasAll.findIndex((c) => c.id === contaId) % accents.length
  }, [conta, contaId, contasAll])
  const accent = accents[accentIdx]

  const baseTotal = (conta?.valorCaixa ?? 0) + (conta?.valorAplicado ?? 0)
  const saldoAtual = baseTotal
  const caixaPct = baseTotal > 0 ? Math.round(((conta?.valorCaixa ?? 0) / baseTotal) * 100) : 0

  const sortedMovs = useMemo(
    () =>
      [...movs].sort((a, b) => {
        const dA = String(a?.data || '')
        const dB = String(b?.data || '')
        if (dB !== dA) return dB.localeCompare(dA)
        return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''))
      }),
    [movs],
  )

  /* ─── Outras contas (para destino de transferência) ─── */
  const outrasContas = useMemo(
    () => contasAll.filter((c) => c.id !== contaId),
    [contasAll, contaId],
  )

  /* ─── Modal state ─── */
  const [open, setOpen] = useState(false)

  /* ─── Componente Movimentacao do Item ─── */
  function MovItem({
    mov,
    i,
    contasAll,
    conta,
    handleDeleteMov,
  }: {
    mov: MovimentacaoConta
    i: number
    contasAll: Conta[]
    conta: Conta
    handleDeleteMov: (mov: MovimentacaoConta) => void
  }) {
    const isT = mov.tipo === 'TRANSFERENCIA'
    const isE = mov.tipo === 'ENTRADA'
    const tint = isT ? '#007AFF' : isE ? '#34C759' : '#FF3B30'
    const typeLbl = isT ? 'Transferência' : isE ? 'Entrada' : 'Saída'
    const MovIcon = isT ? ArrowLeftRight : isE ? ArrowDownRight : ArrowUpRight
    const sc = mov.subconta ?? 'CAIXA'
    const scLbl = SUBCONTA_LABEL[sc]

    const subInfo = isT
      ? (() => {
          if (!mov.transferenciaDestinoId) {
            return `${scLbl} → ${sc === 'CAIXA' ? 'Aplicações' : 'Em Caixa'}`
          }
          const dest = contasAll.find((c) => c.id === mov.transferenciaDestinoId)
          return `→ ${dest?.banco ?? 'Outra conta'}`
        })()
      : scLbl

    return (
      <div
        className={cn(
          'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4 group transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]',
          i > 0 && 'border-t border-border/20',
        )}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
          style={{ backgroundColor: `${tint}14` }}
        >
          <MovIcon className="h-5 w-5" style={{ color: tint }} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] md:text-[16px] font-medium truncate leading-snug">
            {mov.motivo}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
            {typeLbl}
            {subInfo && (
              <>
                <span className="mx-1 opacity-40">·</span>
                {subInfo}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p
              className="text-[16px] font-semibold tabular-nums"
              style={{ color: isT ? '#007AFF' : isE ? '#34C759' : '#FF3B30' }}
            >
              {!isT && (isE ? '+' : '−')}
              {formatCurrency(mov.valor)}
            </p>
            <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
              {formatDate(mov.data || mov.createdAt)}
            </p>
          </div>
          {canManageFinanceiro && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              disabled={reverseMovement.isPending}
              onClick={() => handleDeleteMov(mov)}
              className="flex h-8 w-8 items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 disabled:pointer-events-none disabled:opacity-30"
              style={{ backgroundColor: '#FF3B3012' }}
            >
              <Trash2 className="h-4 w-4" style={{ color: '#FF3B30' }} />
            </motion.button>
          )}
        </div>
      </div>
    )
  }

  /* ─── Excluir movimentação (estorno) ─── */
  function handleDeleteMov(mov: MovimentacaoConta) {
    if (!conta) return
    deleteMovWithUndo(mov.id)
  }

  /* ─── Not found ─── */
  if (isLoadingContas) {
    return (
      <div className="flex flex-col gap-6 p-6 sm:p-8 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 bg-muted rounded-[16px]" />
          <div className="space-y-2 flex-1">
            <div className="h-7 w-1/3 bg-muted rounded" />
            <div className="h-4 w-1/4 bg-muted rounded" />
          </div>
        </div>
        <div className="h-[120px] bg-muted rounded-2xl w-full" />
      </div>
    )
  }

  if (!conta)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Landmark className="h-12 w-12 text-muted-foreground/20" />
        <p className="text-[17px] font-medium text-muted-foreground">Conta não encontrada</p>
        <Button variant="ghost" onClick={() => navigate({ to: '/financeiro' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    )

  const subLabel = [
    conta.agencia ? `Ag. ${conta.agencia}` : '',
    conta.numeroConta ? `CC. ${conta.numeroConta}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ')
  /* ══════ RENDER ══════ */
  return (
    <div className="pb-24">
      {/* Back nav */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="px-4 md:px-6 pt-6 pb-2"
      >
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate({ to: '/financeiro' })}
          className="flex items-center gap-1 text-[17px] font-medium text-primary hover:opacity-70 transition-opacity min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Contas</span>
        </motion.button>
      </motion.div>

      {/* Hero identity */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="px-4 md:px-6 pt-3 pb-6"
      >
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-[16px] flex-shrink-0"
            style={{ backgroundColor: accent.bg }}
          >
            <Landmark className="h-7 w-7" style={{ color: accent.fg }} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-none truncate">
              {conta.banco}
            </h1>
            {subLabel && (
              <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground mt-1.5">
                <CreditCard className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                <span className="truncate">{subLabel}</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="px-4 md:px-6"
      >
        <div
          className="rounded-2xl bg-card border p-5 md:p-6 overflow-hidden"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Ring percent={caixaPct} size={72} stroke={6} color={accent.fg} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[14px] font-bold tabular-nums leading-none">{caixaPct}%</span>
                <span className="text-[7px] text-muted-foreground mt-0.5 tracking-wider">
                  Caixa
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden" style={{ transform: 'translateZ(0)' }}>
              <p className="text-[11px] text-muted-foreground tracking-wide mb-1">Saldo Atual</p>
              <p
                className="text-[22px] md:text-[30px] font-bold tabular-nums tracking-tight leading-none"
                style={{ transform: 'translateZ(0)' }}
              >
                {formatCurrency(saldoAtual)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 mt-5 pt-5 border-t border-border/10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-[6px] flex-shrink-0"
                  style={{ backgroundColor: '#34C75914' }}
                >
                  <Wallet className="h-[14px] w-[14px]" style={{ color: '#34C759' }} />
                </span>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Em caixa
                </p>
              </div>
              <p
                className="text-[18px] font-bold tabular-nums tracking-tight"
                style={{ color: '#34C759' }}
              >
                {formatCurrency(conta.valorCaixa)}
              </p>
            </div>
            <div className="w-px bg-border/20" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-[6px] flex-shrink-0"
                  style={{ backgroundColor: '#007AFF14' }}
                >
                  <FileText className="h-[14px] w-[14px]" style={{ color: '#007AFF' }} />
                </span>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Aplicações
                </p>
              </div>
              <p
                className="text-[18px] font-bold tabular-nums tracking-tight"
                style={{ color: '#007AFF' }}
              >
                {formatCurrency(conta.valorAplicado)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Movimentações */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        className="px-4 md:px-6 mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight">Movimentações</h2>
          {canManageFinanceiro && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                setOpen(true)
              }}
              className="flex items-center gap-1.5 text-[15px] text-primary font-medium hover:opacity-70 transition-opacity min-h-[44px] px-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </motion.button>
          )}
        </div>

        <div className="rounded-2xl bg-card border overflow-hidden">
          {sortedMovs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: '#8E8E9314' }}
              >
                <Receipt className="h-7 w-7 text-muted-foreground/30" />
              </span>
              <p className="text-[17px] font-semibold">Sem movimentações</p>
              <p className="text-[14px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
                Registre entradas, saídas e transferências
              </p>
              {canManageFinanceiro && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setOpen(true)
                  }}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-[15px] font-medium text-white"
                  style={{ backgroundColor: accent.fg }}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Movimentação
                </motion.button>
              )}
            </div>
          ) : (
            sortedMovs.map((mov, i) => (
              <MovItem
                key={mov.id}
                mov={mov}
                i={i}
                contasAll={contasAll}
                conta={conta}
                handleDeleteMov={handleDeleteMov}
              />
            ))
          )}
        </div>
      </motion.div>

      <NovaMovimentacaoDialog open={open} setOpen={setOpen} conta={conta} contasAll={contasAll} />
    </div>
  )
}
