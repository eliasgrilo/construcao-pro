import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#8E8E9314' }}
        aria-hidden="true"
      >
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </span>
      <div className="text-center max-w-[260px]">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 h-10 rounded-xl bg-primary px-5 text-[14px] font-semibold text-white transition-all active:scale-[0.97] hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
