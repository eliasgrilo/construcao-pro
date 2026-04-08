/**
 * analises-shared.tsx
 * Helpers compartilhados entre todos os tabs da página de Análises.
 * Eliminam ~280 linhas de código duplicado nos quatro arquivos de tab.
 */

import { formatCurrency } from '@/lib/utils'

// ─── Status Map ───────────────────────────────────────────────────────────────

export const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  ATIVA: { label: 'Ativa', color: '#34C759', bgColor: '#34C75918' },
  FINALIZADA: { label: 'Finalizada', color: '#8E8E93', bgColor: '#8E8E9318' },
  PAUSADA: { label: 'Pausada', color: '#FF9500', bgColor: '#FF950018' },
  VENDIDO: { label: 'Vendido', color: '#5856D6', bgColor: '#5856D618' },
  TERRENO: { label: 'Terreno', color: '#AF52DE', bgColor: '#AF52DE18' },
  MANUTENCAO: { label: 'Manutenção', color: '#FF9500', bgColor: '#FF950018' },
}

// ─── Ring Color ───────────────────────────────────────────────────────────────

export function ringColor(pct: number) {
  return pct > 90 ? '#FF3B30' : pct > 70 ? '#FF9500' : '#34C759'
}

// ─── Framer Motion Variants ───────────────────────────────────────────────────

export const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} as const

export const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 },
  },
} as const

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────

interface ChartTipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

export function ChartTip({ active, payload, label }: ChartTipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-[12px] font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-[14px] font-bold tabular-nums">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}
