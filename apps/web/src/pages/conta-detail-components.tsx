/**
 * conta-detail-components.tsx
 * Micro-componentes puros extraídos de conta-detail.tsx:
 *   Ring, SegBtn, DestinoCard
 */
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type React from 'react'

/* ─── Ring ─── */
export function Ring({
  percent,
  size = 88,
  stroke = 8,
  color,
}: { percent: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    >
      <title>Progresso Habilidade</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-muted/30"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(percent, 100) / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

/* ─── Segmented button (2-option) ─── */
export function SegBtn({
  active,
  color,
  onClick,
  children,
  layoutId,
}: {
  active: boolean
  color: string
  onClick: () => void
  children: React.ReactNode
  layoutId: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium transition-colors min-h-[42px] z-10 flex-1',
        active ? '' : 'text-muted-foreground hover:text-foreground',
      )}
      style={{ color: active ? color : undefined }}
    >
      {active && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-card rounded-[10px] shadow-sm border border-black/5 dark:border-white/5 -z-10"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        />
      )}
      {children}
    </motion.button>
  )
}

/* ─── Destino card (transfer destination) ─── */
export function DestinoCard({
  selected,
  onSelect,
  icon: Icon,
  color,
  iconBg,
  title,
  subtitle,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ElementType
  color: string
  iconBg: string
  title: string
  subtitle: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] border text-left transition-all',
        selected
          ? 'border-border/40 bg-card shadow-sm'
          : 'border-border/15 bg-black/[0.015] dark:bg-white/[0.025] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-tight tracking-tight truncate">{title}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.3 }}
          >
            <Check className="h-4 w-4 flex-shrink-0" style={{ color }} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
