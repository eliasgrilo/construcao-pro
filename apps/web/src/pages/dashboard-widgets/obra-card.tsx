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
import { ringColor } from './primitives'
export function DashboardObraCard({
  obra,
  navigate,
}: { obra: CustoPorObraRow; navigate: NavigateFn }) {
  const totalInvestido =
    (obra.valor_terreno ?? 0) + (obra.valor_burocracia ?? 0) + (obra.valor_construcao ?? 0)
  const op = obra.orcamento > 0 ? Math.round((totalInvestido / obra.orcamento) * 100) : 0
  const st = statusMap[obra.status] ?? statusMap.ATIVA

  return (
    <motion.button
      variants={cardItemVariants}
      onClick={() =>
        navigate({
          to: '/obras/$obraId',
          params: { obraId: obra.id },
          search: { from: 'dashboard' },
        })
      }
      className="apple-card flex flex-col p-5 text-left cursor-pointer overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[9px] w-[9px] rounded-full"
            style={{ backgroundColor: st.color }}
          />
          <span className="text-[13px] font-medium" style={{ color: st.color }}>
            {st.label}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
      </div>

      <h3 className="text-[17px] font-semibold leading-snug line-clamp-2">{obra.obra}</h3>

      <div className="flex items-center gap-1.5 mt-1.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
        <span className="text-[13px] text-muted-foreground leading-snug truncate">
          {obra.endereco}
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {[
          {
            label: 'Terreno',
            Icon: Landmark,
            color: '#AF52DE',
            value: obra.valor_terreno ?? 0,
            valueColor: (obra.valor_terreno ?? 0) > 0 ? '#AF52DE' : undefined,
          },
          {
            label: 'Burocracia',
            Icon: FileText,
            color: '#007AFF',
            value: obra.valor_burocracia ?? 0,
            valueColor: (obra.valor_burocracia ?? 0) > 0 ? '#007AFF' : undefined,
          },
          {
            label: 'Construção',
            Icon: Building2,
            color: '#FF9500',
            value: obra.valor_construcao ?? 0,
            valueColor: (obra.valor_construcao ?? 0) > 0 ? '#FF9500' : undefined,
          },
        ].map(({ label, Icon, color, value, valueColor }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-md flex-shrink-0"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon className="h-3 w-3" style={{ color }} />
            </span>
            <span className="text-[12px] text-muted-foreground">{label}</span>
            <span
              className="text-[12px] font-semibold tabular-nums ml-auto"
              style={{ color: valueColor }}
            >
              {formatCurrency(value)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-4" />

      <div className="mt-4 pt-4 border-t border-border/15">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[15px] font-semibold tabular-nums">
            {formatCurrency(totalInvestido)}
          </span>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            de {formatCurrency(obra.orcamento)}
          </span>
        </div>
        <div className="h-[5px] w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(op, 100)}%`,
              backgroundColor: ringColor(op),
            }}
          />
        </div>
        <p className="text-[12px] text-muted-foreground mt-1.5 tabular-nums">
          {op}% do orçamento utilizado
        </p>
      </div>
    </motion.button>
  )
}

export function DashboardFilterMenuItem({
  obra,
  i,
  defaultObraId,
  setDefaultObraId,
  setContextDropOpen,
}: {
  obra: { id: string; nome: string }
  i: number
  defaultObraId: string
  setDefaultObraId: (id: string) => void
  setContextDropOpen: (v: boolean) => void
}) {
  const isSelected = (obra.id === '' && !defaultObraId) || obra.id === defaultObraId
  const obraColor = obraColors[i % obraColors.length]

  return (
    <button
      type="button"
      onClick={() => {
        setDefaultObraId(obra.id)
        setContextDropOpen(false)
      }}
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] transition-colors',
        i > 0 && 'border-t border-black/[0.05] dark:border-white/[0.05]',
      )}
      style={{
        backgroundColor: isSelected ? `${obraColor}0D` : undefined,
      }}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
        style={{
          backgroundColor: isSelected ? `${obraColor}1F` : 'rgba(60,60,67,0.06)',
        }}
      >
        {obra.id ? (
          <Building2
            className="h-3.5 w-3.5"
            style={{ color: isSelected ? obraColor : '#8E8E93' }}
          />
        ) : (
          <X className="h-3.5 w-3.5" style={{ color: isSelected ? obraColor : '#8E8E93' }} />
        )}
      </span>
      <span
        className="flex-1 font-medium truncate"
        style={{ color: isSelected ? obraColor : undefined }}
      >
        {obra.nome}
      </span>
      {isSelected && (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: obraColor }}
        />
      )}
    </button>
  )
}

export const statusMap: Record<string, { label: string; color: string }> = {
  ATIVA: { label: 'Ativa', color: '#34C759' },
  PAUSADA: { label: 'Pausada', color: '#FF9500' },
  FINALIZADA: { label: 'Finalizada', color: '#8E8E93' },
  VENDIDO: { label: 'Vendido', color: '#5856D6' },
  TERRENO: { label: 'Terreno', color: '#AF52DE' },
}

export const statusBreakdown = [
  { key: 'ATIVA', label: 'Ativa', color: '#34C759' },
  { key: 'TERRENO', label: 'Terreno', color: '#AF52DE' },
  { key: 'VENDIDO', label: 'Vendido', color: '#5856D6' },
]

export const tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
  ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: clr.green },
  SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: clr.red },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: clr.blue },
}

export const DashboardAtividadeRecenteItem = memo(function DashboardAtividadeRecenteItem({
  mov,
  tipos,
}: {
  mov: Record<string, unknown>
  tipos: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }>
}) {
  const m = mov as MovimentacaoRecenteItem
  const t = tipos[m.tipo as keyof typeof tipos] ?? tipos.ENTRADA
  const Icon = t.icon
  const precoUnit = m.preco_unitario ?? m.precoUnitario ?? m.material?.preco_unitario ?? 0
  const cost = m.quantidade * precoUnit
  const isSaida = m.tipo === 'SAIDA'

  const obraNome =
    (m.almoxarifado as { obra?: { nome?: string | null } | null } | null)?.obra?.nome ?? null
  const nfNumero = (m.nf as { numero?: string | number | null } | null)?.numero ?? null
  const formaPagamento = m.forma_pagamento ?? null

  const nfObj = m.nf as {
    contas_pagar?: Array<{
      contas_pagar_parcelas?: Array<{ numero_parcela?: number; total_parcelas?: number }>
    }>
  } | null
  const firstParcela = nfObj?.contas_pagar?.[0]?.contas_pagar_parcelas?.[0]
  const parcelaLabel =
    firstParcela?.numero_parcela && firstParcela?.total_parcelas
      ? ` ${firstParcela.numero_parcela}/${firstParcela.total_parcelas}`
      : ''

  const hora = m.created_at
    ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null
  const dataFormatada = m.created_at
    ? new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  const pagamentoLabel =
    formaPagamento === 'PIX'
      ? 'PIX'
      : formaPagamento === 'CARTAO_CREDITO'
        ? `Crédito${parcelaLabel}`
        : formaPagamento === 'BOLETO'
          ? 'Boleto'
          : (formaPagamento ?? null)

  const pagamentoBg =
    formaPagamento === 'PIX'
      ? 'rgba(52,199,89,0.12)'
      : formaPagamento === 'CARTAO_CREDITO'
        ? 'rgba(88,86,214,0.12)'
        : formaPagamento === 'BOLETO'
          ? 'rgba(255,149,0,0.12)'
          : 'rgba(142,142,147,0.1)'

  const pagamentoColor =
    formaPagamento === 'PIX'
      ? '#34C759'
      : formaPagamento === 'CARTAO_CREDITO'
        ? '#5856D6'
        : formaPagamento === 'BOLETO'
          ? '#FF9500'
          : '#8E8E93'

  const priceColor = isSaida ? 'var(--color-destructive)' : 'var(--color-success)'

  const tintColor =
    t.tint === clr.green
      ? 'var(--color-success)'
      : t.tint === clr.red
        ? 'var(--color-destructive)'
        : t.tint === clr.blue
          ? 'var(--color-primary)'
          : t.tint

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl bg-card border border-border/25 p-4 flex gap-3.5"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* ── Icon chip ── */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[13px] flex-shrink-0 mt-0.5"
        style={{ background: `color-mix(in srgb, ${tintColor} 11%, transparent)` }}
      >
        <Icon className="h-[19px] w-[19px]" style={{ color: tintColor }} />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-w-0">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-snug tracking-[-0.02em] truncate">
            {m.material?.nome ?? '—'}
          </p>
          <div className="text-right flex-shrink-0 ml-1">
            <p
              className="text-[15px] font-bold tabular-nums tracking-[-0.022em] leading-none"
              style={{ color: priceColor }}
            >
              {isSaida ? '−' : '+'}
              {formatCurrency(cost)}
            </p>
            {precoUnit > 0 && (
              <p className="text-[11px] text-muted-foreground/50 tabular-nums mt-0.5">
                {formatNumber(m.quantidade)} × {formatCurrency(precoUnit)}
              </p>
            )}
          </div>
        </div>

        {/* ── Badges row ── */}
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          {/* Tipo badge */}
          <span
            className="inline-flex items-center text-[11px] font-semibold px-2 py-[3px] rounded-full"
            style={{
              background: `color-mix(in srgb, ${tintColor} 10%, transparent)`,
              color: tintColor,
            }}
          >
            <Icon className="h-[9px] w-[9px] mr-1" />
            {t.label}
          </span>

          {/* Obra chip */}
          {obraNome && (
            <span className="inline-flex items-center gap-[4px] text-[11px] text-muted-foreground/65 bg-muted/50 px-2 py-[3px] rounded-full">
              <Home className="h-[9px] w-[9px] flex-shrink-0" />
              <span className="truncate max-w-[100px]">{obraNome}</span>
            </span>
          )}

          {/* NF-e chip */}
          {nfNumero && (
            <span className="inline-flex items-center gap-[4px] text-[11px] text-muted-foreground/60 bg-muted/50 px-2 py-[3px] rounded-full">
              <FileText className="h-[9px] w-[9px] flex-shrink-0" />
              NF {nfNumero}
            </span>
          )}

          {/* Payment badge */}
          {pagamentoLabel && (
            <span
              className="inline-flex items-center text-[11px] font-semibold px-2 py-[3px] rounded-full"
              style={{ background: pagamentoBg, color: pagamentoColor }}
            >
              {pagamentoLabel}
            </span>
          )}
        </div>

        {/* ── Timestamp ── */}
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

export const DashboardAlertaEstoqueItem = memo(function DashboardAlertaEstoqueItem({
  alerta,
  i,
  clr,
}: {
  alerta: EstoqueAlertaRow
  i: number
  clr: ClrColors
}) {
  const qty = alerta.quantidade ?? 0
  const min = alerta.estoque_minimo ?? 0
  const isCritical = qty === 0
  const pctStock = min > 0 ? Math.min((qty / min) * 100, 100) : 0
  const accentColor = isCritical ? clr.red : clr.orange
  return (
    <div
      className={cn(
        'flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5',
        i > 0 && 'border-t border-border/15',
      )}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
        style={{ backgroundColor: `${accentColor}14` }}
      >
        <Package className="h-4 w-4" style={{ color: accentColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 min-w-0">
          <p className="text-[15px] font-medium truncate leading-snug min-w-0">
            {alerta.material_nome ?? '—'}
          </p>
          <span
            className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isCritical ? '#FF3B3018' : '#FF950018',
              color: accentColor,
            }}
          >
            {isCritical ? 'Sem estoque' : 'Estoque baixo'}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground truncate">
          {alerta.almoxarifado_nome ?? '—'} · {alerta.obra_nome ?? '—'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-[3px] rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pctStock}%`, backgroundColor: accentColor }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground flex-shrink-0">
            {formatNumber(qty)} / {formatNumber(min)} un.
          </span>
        </div>
      </div>
    </div>
  )
})
export type MovimentacaoRecenteItem = {
  id: string
  tipo: string
  quantidade: number
  preco_unitario?: number | null
  precoUnitario?: number
  material?: { nome?: string; preco_unitario?: number } | null
  created_at: string
  almoxarifado?: {
    nome?: string | null
    obra?: { nome?: string | null; endereco?: string | null } | null
  } | null
  nf?: {
    numero?: string | number | null
    contas_pagar?: Array<{
      contas_pagar_parcelas?: Array<{
        numero_parcela?: number
        total_parcelas?: number
      }>
    }>
  } | null
  forma_pagamento?: string | null
}
