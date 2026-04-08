import { useToast } from '@/components/ui/toast'
import {
  type ObraManutencao,
  type ObraRow,
  type Tarefa,
  useConcluirManutencao,
  useCreateManutencaoItem,
  useUpdateManutencaoItem,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  MapPin,
  Package,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, memo, useMemo, useRef, useState } from 'react'
import {
  type ClrColors,
  type CustoPorObraRow,
  type EstoqueAlertaRow,
  type NavigateFn,
  cardItemVariants,
  cardListVariants,
  clr,
  greeting,
  obraColors,
} from '../dashboard-shared'
import { statusBreakdown } from './obra-card'
import { Ring, ringColor } from './primitives'
export function DashboardSaldo({
  totalDisponivel,
  contasLoading,
  totalCaixa,
  totalAplicado,
}: {
  totalDisponivel: number
  contasLoading: boolean
  totalCaixa: number
  totalAplicado: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-6 px-4 md:px-6"
    >
      <div
        className="rounded-2xl bg-card border p-6 md:p-8 overflow-hidden"
        style={{ transform: 'translateZ(0)' }}
      >
        <p className="text-[13px] font-medium text-muted-foreground tracking-wide">
          Saldo Disponível
        </p>
        {contasLoading ? (
          <div className="h-[38px] w-48 rounded-lg bg-muted/60 animate-pulse mt-2" />
        ) : (
          <p
            className="text-[34px] md:text-[40px] font-bold tabular-nums tracking-tight leading-none mt-2 truncate"
            style={{ transform: 'translateZ(0)' }}
          >
            {formatCurrency(totalDisponivel)}
          </p>
        )}

        <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-border/15">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                style={{ backgroundColor: '#34C75914' }}
              >
                <Wallet className="h-3 w-3" style={{ color: '#34C759' }} />
              </span>
              <span className="text-[13px] text-muted-foreground/70">Em Caixa</span>
            </div>
            {contasLoading ? (
              <div className="h-[16px] w-20 rounded bg-muted/60 animate-pulse" />
            ) : (
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: '#34C759' }}>
                {formatCurrency(totalCaixa)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0"
                style={{ backgroundColor: '#007AFF14' }}
              >
                <FileText className="h-3 w-3" style={{ color: '#007AFF' }} />
              </span>
              <span className="text-[13px] text-muted-foreground/70">Aplicações</span>
            </div>
            {contasLoading ? (
              <div className="h-[16px] w-20 rounded bg-muted/60 animate-pulse" />
            ) : (
              <span className="text-[15px] font-semibold tabular-nums" style={{ color: '#007AFF' }}>
                {formatCurrency(totalAplicado)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function DashboardOrcamento({
  pct,
  s,
  obrasData,
  onNavigateObrasByStatus,
}: {
  pct: number
  s: { custoTotal: number; orcamentoTotal: number } | undefined
  obrasData: ObraRow[] | undefined
  onNavigateObrasByStatus: (status: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="mt-4 px-4 md:px-6"
    >
      <div className="rounded-2xl bg-card overflow-hidden md:shadow-sm md:border md:border-border/5">
        {/* ── Ring + Metrics — compact horizontal ── */}
        <div className="flex items-center gap-4 p-5 md:gap-8 md:px-10 md:py-8">
          {/* Ring */}
          <div className="relative flex-shrink-0">
            <div className="md:hidden">
              <Ring percent={pct} size={96} stroke={8} color={ringColor(pct)} />
            </div>
            <div className="hidden md:block">
              <Ring percent={pct} size={120} stroke={10} color={ringColor(pct)} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-[20px] md:text-[26px] font-bold tabular-nums leading-none tracking-tight"
                style={{ color: ringColor(pct) }}
              >
                {pct}%
              </span>
              <span className="text-[9px] md:text-[10px] font-medium text-muted-foreground/50 uppercase tracking-[0.1em] mt-0.5">
                usado
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] md:text-[15px] font-medium text-muted-foreground tracking-wide">
              Orçamento Geral
            </p>
            <p className="text-[26px] md:text-[36px] font-bold tabular-nums tracking-tight leading-none mt-1 md:mt-2 truncate">
              {formatCurrency(s?.custoTotal ?? 0)}
            </p>
            <p className="text-[13px] md:text-[15px] text-muted-foreground/60 mt-1 md:mt-1.5 truncate">
              de {formatCurrency(s?.orcamentoTotal ?? 0)}
            </p>

            {/* Progress bar */}
            <div className="mt-2.5 md:mt-4 h-[3px] md:h-[5px] w-full rounded-full overflow-hidden bg-muted/12">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: ringColor(pct) }}
              />
            </div>
            {(s?.orcamentoTotal ?? 0) > 0 && (
              <p className="text-[12px] md:text-[14px] text-muted-foreground/50 mt-1.5 md:mt-2 tabular-nums truncate">
                {(s?.custoTotal ?? 0) <= (s?.orcamentoTotal ?? 0)
                  ? `Restam ${formatCurrency((s?.orcamentoTotal ?? 0) - (s?.custoTotal ?? 0))}`
                  : `Excedido em ${formatCurrency((s?.custoTotal ?? 0) - (s?.orcamentoTotal ?? 0))}`}
              </p>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-border/8" />

        {/* ── Status row — compact on mobile, table-like on desktop ── */}
        <div className="grid grid-cols-4">
          {statusBreakdown.map((st, i) => {
            const count = obrasData?.filter((o) => o.status === st.key).length ?? 0
            return (
              <motion.button
                key={st.key}
                className={cn(
                  'flex flex-col items-center justify-center py-2.5 gap-0.5',
                  'md:flex-row md:justify-center md:gap-3 md:py-5',
                  i > 0 && 'border-l border-border/8',
                  count === 0 && 'opacity-25',
                )}
                whileTap={{ scale: 0.92 }}
                onClick={() => onNavigateObrasByStatus(st.key)}
              >
                <span
                  className="text-[17px] md:text-[22px] font-bold tabular-nums leading-none"
                  style={{ color: count > 0 ? st.color : undefined }}
                >
                  {count}
                </span>
                <span className="flex items-center gap-1 md:gap-1.5">
                  <span
                    className="h-1 w-1 md:h-2 md:w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <span className="text-[10px] md:text-[13px] text-muted-foreground">
                    {st.label}
                  </span>
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
