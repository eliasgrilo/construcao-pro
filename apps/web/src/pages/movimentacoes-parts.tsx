import { Badge } from '@/components/ui/badge'
import type { FinanceiroMovimentacaoWithConta, MovimentacaoRow } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Home, Landmark, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type ReactNode, memo } from 'react'

// ── Color palette (Apple system) ──────────────────────────────────────────────
export const clr = {
  green: '#34C759',
  red: '#FF3B30',
  blue: '#007AFF',
  purple: '#AF52DE',
  orange: '#FF9500',
} as const

// ── Tab system ────────────────────────────────────────────────────────────────
export type TabKey = 'TODAS' | 'ENTRADAS' | 'SAIDAS' | 'TRANSFERENCIAS' | 'IMOVEIS' | 'FINANCEIRO'

export const TABS: { key: TabKey; label: string; color?: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'ENTRADAS', label: 'Entradas', color: clr.green },
  { key: 'SAIDAS', label: 'Saídas', color: clr.red },
  { key: 'TRANSFERENCIAS', label: 'Transferências', color: clr.blue },
  { key: 'IMOVEIS', label: 'Imóveis', color: clr.purple },
  { key: 'FINANCEIRO', label: 'Financeiro', color: clr.orange },
]

// ── Shared card animation variants ───────────────────────────────────────────
export const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as number[] },
  },
}

// ── Chip ──────────────────────────────────────────────────────────────────────
export function Chip({
  icon: Icon,
  label,
  color,
  bg,
}: {
  icon?: LucideIcon
  label: string
  color?: string
  bg?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-[3px] text-[11px] font-medium px-2 py-[3px] rounded-full whitespace-nowrap"
      style={{
        background:
          bg ??
          (color ? `color-mix(in srgb, ${color} 12%, transparent)` : 'hsl(var(--muted) / 0.5)'),
        color: color ?? 'hsl(var(--muted-foreground) / 0.65)',
      }}
    >
      {Icon && <Icon className="h-[9px] w-[9px] flex-shrink-0" />}
      {label}
    </span>
  )
}

// ── MovCard — stock material movement ─────────────────────────────────────────
export const MovCard = memo(function MovCard({ mov }: { mov: MovimentacaoRow }) {
  const isEntrada = mov.tipo === 'ENTRADA'
  const isSaida = mov.tipo === 'SAIDA'
  const isTransfer = mov.tipo === 'TRANSFERENCIA'

  const tint = isEntrada ? clr.green : isSaida ? clr.red : clr.blue
  const Icon = isEntrada ? ArrowDownRight : isSaida ? ArrowUpRight : ArrowLeftRight
  const label = isEntrada ? 'Entrada' : isSaida ? 'Saída' : 'Transferência'
  const total = (mov.preco_unitario ?? 0) * mov.quantidade

  const hora = new Date(mov.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const data = new Date(mov.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

  const pagamentoLabel =
    mov.forma_pagamento === 'PIX'
      ? 'PIX'
      : mov.forma_pagamento === 'BOLETO'
        ? 'Boleto'
        : mov.forma_pagamento === 'CARTAO_DEBITO'
          ? 'Débito'
          : mov.forma_pagamento === 'CARTAO_CREDITO'
            ? 'Crédito'
            : mov.forma_pagamento === 'DINHEIRO'
              ? 'Dinheiro'
              : mov.forma_pagamento === 'TRANSFERENCIA'
                ? 'Transf.'
                : null

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl bg-card border border-border/25 p-4 flex gap-3.5"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Icon chip */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[13px] flex-shrink-0 mt-0.5"
        style={{ background: `color-mix(in srgb, ${tint} 11%, transparent)` }}
      >
        <Icon className="h-[19px] w-[19px]" style={{ color: tint }} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-snug tracking-[-0.02em] truncate">
            {mov.material?.nome ?? '—'}
          </p>
          <p
            className="text-[15px] font-bold tabular-nums tracking-[-0.022em] leading-none flex-shrink-0 ml-1"
            style={{ color: isEntrada ? clr.green : isSaida ? clr.red : clr.blue }}
          >
            {isEntrada ? '+' : isSaida ? '−' : '⇄'}
            {formatNumber(mov.quantidade)}
          </p>
        </div>

        {/* Chips */}
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <Chip icon={Icon} label={label} color={tint} />
          {mov.almoxarifado?.obra?.nome && <Chip label={mov.almoxarifado.obra.nome} />}
          {pagamentoLabel && <Chip label={pagamentoLabel} />}
          {mov.fornecedor?.nome && <Chip label={mov.fornecedor.nome} />}
          {mov.status_transferencia && (
            <Badge
              variant={
                mov.status_transferencia === 'APROVADA'
                  ? 'default'
                  : mov.status_transferencia === 'REJEITADA'
                    ? 'destructive'
                    : 'secondary'
              }
              className={cn(
                'text-[10px] px-1.5 py-0 h-4',
                mov.status_transferencia === 'APROVADA' && 'bg-success/15 text-success border-0',
              )}
            >
              {mov.status_transferencia}
            </Badge>
          )}
        </div>

        {/* Timestamp + value */}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-muted-foreground/40 tabular-nums">
            {data} · {hora}
          </p>
          {total > 0 && (
            <p className="text-[11px] text-muted-foreground/50 tabular-nums">
              {formatCurrency(total)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
})

// ── ObraVenda type ────────────────────────────────────────────────────────────
export type ObraVenda = {
  id: string
  obra: string
  endereco: string
  status: string
  valor_venda: number
  custo: number
  orcamento: number
}

// ── ImovelCard — obra sale record ─────────────────────────────────────────────
export const ImovelCard = memo(function ImovelCard({ obra }: { obra: ObraVenda }) {
  const lucro = obra.valor_venda - obra.custo
  const isLucro = lucro >= 0

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl bg-card border border-border/25 p-4 flex gap-3.5"
      style={{ transform: 'translateZ(0)' }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[13px] flex-shrink-0 mt-0.5"
        style={{ background: `color-mix(in srgb, ${clr.purple} 11%, transparent)` }}
      >
        <Home className="h-[19px] w-[19px]" style={{ color: clr.purple }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-snug tracking-[-0.02em] truncate">
            {obra.obra}
          </p>
          <div className="text-right flex-shrink-0 ml-1">
            <p
              className="text-[15px] font-bold tabular-nums tracking-[-0.022em] leading-none"
              style={{ color: clr.purple }}
            >
              {formatCurrency(obra.valor_venda)}
            </p>
            {obra.custo > 0 && (
              <p
                className="text-[11px] tabular-nums mt-0.5"
                style={{ color: isLucro ? clr.green : clr.red }}
              >
                {isLucro ? '+' : ''}
                {formatCurrency(lucro)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <Chip icon={Home} label="Venda" color={clr.purple} />
          {obra.status && <Chip label={obra.status} />}
          {obra.custo > 0 && <Chip label={`Custo: ${formatCurrency(obra.custo)}`} />}
        </div>

        {obra.endereco && (
          <p className="text-[11px] text-muted-foreground/40 tabular-nums mt-1.5 truncate">
            {obra.endereco}
          </p>
        )}
      </div>
    </motion.div>
  )
})

// ── FinanceiroCard — bank/cash transaction ───────────────────────────────────
export const FinanceiroCard = memo(function FinanceiroCard({
  mov,
}: {
  mov: FinanceiroMovimentacaoWithConta
}) {
  const isEntrada = mov.tipo === 'ENTRADA'
  const isSaida = mov.tipo === 'SAIDA'
  const tint = isEntrada ? clr.green : isSaida ? clr.red : clr.orange
  const Icon = isEntrada ? ArrowDownRight : isSaida ? ArrowUpRight : ArrowLeftRight
  const label = isEntrada ? 'Entrada' : isSaida ? 'Saída' : 'Transferência'

  const dateStr = mov.data ?? mov.created_at
  const dataFormatada = dateStr
    ? new Date(mov.data ? `${mov.data}T12:00:00` : dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null
  const hora = mov.created_at
    ? new Date(mov.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl bg-card border border-border/25 p-4 flex gap-3.5"
      style={{ transform: 'translateZ(0)' }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[13px] flex-shrink-0 mt-0.5"
        style={{ background: `color-mix(in srgb, ${tint} 11%, transparent)` }}
      >
        <Icon className="h-[19px] w-[19px]" style={{ color: tint }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-snug tracking-[-0.02em] truncate">
            {mov.motivo || '—'}
          </p>
          <p
            className="text-[15px] font-bold tabular-nums tracking-[-0.022em] leading-none flex-shrink-0 ml-1"
            style={{ color: isSaida ? clr.red : clr.green }}
          >
            {isSaida ? '−' : '+'}
            {formatCurrency(mov.valor)}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <Chip icon={Icon} label={label} color={tint} />
          {mov.financeiro_contas?.banco && (
            <Chip icon={Landmark} label={mov.financeiro_contas.banco} />
          )}
          <Chip label={mov.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações'} />
        </div>

        {(dataFormatada || hora) && (
          <p className="text-[11px] text-muted-foreground/40 tabular-nums mt-1.5">
            {dataFormatada}
            {hora ? ` · ${hora}` : ''}
          </p>
        )}
      </div>
    </motion.div>
  )
})

// ── SectionBlock ──────────────────────────────────────────────────────────────
export function SectionBlock({
  label,
  count,
  color,
  children,
}: {
  label: string
  count: number
  color: string
  children: ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <h2 className="text-[17px] font-bold tracking-[-0.025em] leading-none">{label}</h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  )
}

// ── MovimentacoesEmptyState ───────────────────────────────────────────────────
export function MovimentacoesEmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="mb-3 opacity-25">{icon}</div>
      <p className="text-[17px] font-semibold">{message}</p>
      <p className="text-[13px] opacity-60 mt-1">Tente ajustar a busca ou os filtros</p>
    </div>
  )
}

// ── SkeletonCards ─────────────────────────────────────────────────────────────
export function SkeletonCards() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-card border border-border/25 p-4 flex gap-3.5 animate-pulse"
        >
          <div className="h-11 w-11 rounded-[13px] bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex justify-between gap-4">
              <div className="h-4 w-2/5 bg-muted rounded-lg" />
              <div className="h-4 w-1/5 bg-muted rounded-lg" />
            </div>
            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-14 bg-muted rounded-full" />
              <div className="h-5 w-20 bg-muted rounded-full" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
            <div className="h-3 w-1/4 bg-muted rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/25 px-4 py-3.5">
      <p className="text-[11px] text-muted-foreground/70 font-medium mb-1 uppercase tracking-wide">
        {label}
      </p>
      <p
        className="text-[18px] font-bold tabular-nums tracking-[-0.03em] leading-none"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  )
}

// ── Package icon for empty states ─────────────────────────────────────────────
export { Package }
