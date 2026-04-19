import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useId } from 'react'

// ─── Motion Variants ──────────────────────────────────────────────────────────

export const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
} as const

export const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 480, damping: 36, mass: 0.7 },
  },
} as const

export const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 },
  },
} as const

// ─── Status Map ───────────────────────────────────────────────────────────────

export const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  ATIVA: { label: 'Ativa', color: '#34C759', bgColor: '#34C75918' },
  FINALIZADA: { label: 'Finalizada', color: '#8E8E93', bgColor: '#8E8E9318' },
  PAUSADA: { label: 'Pausada', color: '#FF9500', bgColor: '#FF950018' },
  VENDIDO: { label: 'Vendido', color: '#5856D6', bgColor: '#5856D618' },
  TERRENO: { label: 'Terreno', color: '#AF52DE', bgColor: '#AF52DE18' },
  MANUTENCAO: { label: 'Manutenção', color: '#FF9500', bgColor: '#FF950018' },
}

export function ringColor(pct: number) {
  return pct > 90 ? '#FF3B30' : pct > 70 ? '#FF9500' : '#34C759'
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number
  formatter?: (v: number) => string
  className?: string
}

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 160, damping: 26, mass: 0.8 })
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v)
    return formatter ? formatter(rounded) : formatNumber(rounded)
  })

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  return <motion.span className={className}>{display}</motion.span>
}

// ─── AnimatedCurrency ─────────────────────────────────────────────────────────

interface AnimatedCurrencyProps {
  value: number
  className?: string
}

export function AnimatedCurrency({ value, className }: AnimatedCurrencyProps) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 100, damping: 22, mass: 1 })
  const display = useTransform(spring, (v) => formatCurrency(Math.round(v)))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  return <motion.span className={className}>{display}</motion.span>
}

// ─── RadialProgress ───────────────────────────────────────────────────────────

interface RadialProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
  delay?: number
}

export function RadialProgress({
  value,
  size = 52,
  strokeWidth = 4.5,
  color,
  className,
  delay = 0,
}: RadialProgressProps) {
  const resolvedColor = color ?? ringColor(value)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value, 0), 100)
  const offset = circumference * (1 - pct / 100)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(142,142,147,0.18)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={resolvedColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
    </svg>
  )
}

// ─── TrendBadge ───────────────────────────────────────────────────────────────

interface TrendBadgeProps {
  value: number
  suffix?: string
  className?: string
  invertColors?: boolean
  showSign?: boolean
}

export function TrendBadge({
  value,
  suffix = '%',
  className,
  invertColors = false,
  showSign = true,
}: TrendBadgeProps) {
  const isPositive = value >= 0
  const isGood = invertColors ? !isPositive : isPositive
  const color = Math.abs(value) < 1 ? '#8E8E93' : isGood ? '#34C759' : '#FF3B30'
  const bg = Math.abs(value) < 1 ? 'rgba(142,142,147,0.12)' : isGood ? '#34C75918' : '#FF3B3018'

  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-semibold tabular-nums', className)}
      style={{ color, backgroundColor: bg }}
    >
      {showSign && value > 0 ? '+' : ''}
      {formatNumber(value)}
      {suffix}
    </span>
  )
}

// ─── GlassCard ────────────────────────────────────────────────────────────────

interface GlassCardProps {
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function GlassCard({ className, children, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border bg-card/80 backdrop-blur-md',
        'border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
        onClick && 'cursor-pointer hover:bg-card/95 active:scale-[0.99] transition-all',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: number
  delta?: number
  deltaInverted?: boolean
  formatter?: 'currency' | 'number' | 'percent'
  accent?: string
  icon?: React.ReactNode
  description?: string
  className?: string
  delay?: number
}

export function MetricCard({
  label,
  value,
  delta,
  deltaInverted,
  formatter = 'currency',
  accent = '#007AFF',
  icon,
  description,
  className,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div variants={itemVariants} custom={delay} className={cn('rounded-2xl bg-card border border-border/50 p-4 flex flex-col gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground leading-none">{label}</p>
        {icon && (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18`, color: accent }}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          {formatter === 'currency' ? (
            <AnimatedCurrency value={value} className="text-[22px] font-bold tabular-nums leading-none" />
          ) : formatter === 'percent' ? (
            <AnimatedNumber
              value={value}
              formatter={(v) => `${formatNumber(v)}%`}
              className="text-[22px] font-bold tabular-nums leading-none"
            />
          ) : (
            <AnimatedNumber
              value={value}
              className="text-[22px] font-bold tabular-nums leading-none"
            />
          )}
          {description && (
            <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {delta != null && (
          <TrendBadge value={delta} invertColors={deltaInverted} />
        )}
      </div>
    </motion.div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

// ─── SparkBar ─────────────────────────────────────────────────────────────────

interface SparkBarProps {
  value: number
  color?: string
  className?: string
  delay?: number
  height?: number
  max?: number
}

export function SparkBar({ value, color = '#007AFF', className, delay = 0, height = 5, max = 100 }: SparkBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className={cn('rounded-full bg-muted/25 overflow-hidden', className)} style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  )
}

// ─── ChartTip ─────────────────────────────────────────────────────────────────

interface ChartTipProps {
  active?: boolean
  payload?: Array<{ value: number; name?: string }>
  label?: string
}

export function ChartTip({ active, payload, label }: ChartTipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl">
      <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[14px] font-bold tabular-nums">
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── GradientDefs (reusable SVG gradient helper) ──────────────────────────────

export function AreaGradient({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.28} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  )
}

// ─── LoadingGrid ──────────────────────────────────────────────────────────────

interface LoadingGridProps {
  cols?: number
  rows?: number
  cardHeight?: number
}

export function LoadingGrid({ cols = 4, rows = 1, cardHeight = 88 }: LoadingGridProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={`${id}-r${ri}`} className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={`${id}-c${ci}`}
              className="rounded-2xl bg-muted/40 animate-pulse"
              style={{ height: cardHeight }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
