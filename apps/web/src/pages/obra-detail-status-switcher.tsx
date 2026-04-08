/**
 * obra-detail-status-switcher.tsx
 * statusMap + StatusSwitcher extracted from obra-detail-header.tsx
 */
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ObraStatus = Database['public']['Tables']['obras']['Row']['status']

export const statusMap: Record<
  string,
  {
    label: string
    variant: 'success' | 'secondary' | 'warning' | 'info'
    color: string
    rgb: string
  }
> = {
  ATIVA: { label: 'Ativa', variant: 'success', color: '#34C759', rgb: '52,199,89' },
  FINALIZADA: { label: 'Finalizada', variant: 'secondary', color: '#8E8E93', rgb: '142,142,147' },
  MANUTENCAO: { label: 'Manutenção', variant: 'warning', color: '#FF9500', rgb: '255,149,0' },
  PAUSADA: { label: 'Pausada', variant: 'warning', color: '#FF9500', rgb: '255,149,0' },
  VENDIDO: { label: 'Vendido', variant: 'info', color: '#5856D6', rgb: '88,86,214' },
  TERRENO: { label: 'Terreno', variant: 'info', color: '#AF52DE', rgb: '175,82,222' },
}

export function StatusSwitcher({
  currentStatus,
  isUpdating,
  onStatusChange,
}: {
  currentStatus: ObraStatus
  isUpdating: boolean
  onStatusChange: (status: ObraStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = statusMap[currentStatus]
  const rgb = current?.rgb ?? '142,142,147'
  const glowStyle = {
    boxShadow: `0 0 0 1px rgba(${rgb},0.25), 0 0 14px rgba(${rgb},0.45), 0 0 28px rgba(${rgb},0.12)`,
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        onClick={() => !isUpdating && setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[12px] font-semibold tracking-[0.01em] border transition-all select-none',
          isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer',
          current?.variant === 'success' &&
            'bg-[#34C759]/12 text-[#34C759] border-[#34C759]/25 hover:bg-[#34C759]/20',
          current?.variant === 'warning' &&
            'bg-[#FF9500]/12 text-[#FF9500] border-[#FF9500]/20 hover:bg-[#FF9500]/20',
          current?.variant === 'secondary' &&
            'bg-secondary text-secondary-foreground border-border hover:bg-accent',
          current?.variant === 'info' &&
            'bg-[#5856D6]/10 text-[#5856D6] border-[#5856D6]/20 hover:bg-[#5856D6]/20',
        )}
        style={glowStyle}
      >
        <motion.span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: current?.color }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.55, 1] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.4, ease: 'easeInOut' }}
        />
        {current?.label}
        <motion.span
          className="flex items-center"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <ChevronDown className="h-2.5 w-2.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute left-0 top-full mt-2 min-w-[148px] rounded-xl bg-popover border shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden py-1"
          >
            {Object.entries(statusMap).map(([key, cfg], i) => (
              <motion.button
                key={key}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.15 }}
                disabled={isUpdating}
                onClick={() => {
                  if (key !== currentStatus) onStatusChange(key as ObraStatus)
                  setOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left',
                  key === currentStatus
                    ? 'text-foreground font-medium bg-accent/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  isUpdating && 'pointer-events-none',
                )}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                {cfg.label}
                {key === currentStatus && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
