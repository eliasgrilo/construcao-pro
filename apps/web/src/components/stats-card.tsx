import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'group rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-default',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 transition-transform duration-200 group-hover:scale-110">
          <Icon className="h-[18px] w-[18px] text-primary" />
        </div>
      </div>
      <div className="mt-2.5">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
        {trend && (
          <div
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              trend.positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
            )}
          >
            <span>{trend.positive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            <span className="font-normal text-muted-foreground ml-0.5">vs mês anterior</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
