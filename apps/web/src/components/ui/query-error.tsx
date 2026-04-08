import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface QueryErrorProps {
  onRetry?: () => void
  message?: string
}

export function QueryError({
  onRetry,
  message = 'Não foi possível carregar os dados.',
}: QueryErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="alert"
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10"
        aria-hidden="true"
      >
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </span>
      <div className="text-center">
        <p className="text-[17px] font-semibold">Erro ao carregar</p>
        <p className="mt-1 text-[14px] text-muted-foreground max-w-[240px] leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 h-10 rounded-xl border border-border px-4 text-[14px] font-medium transition-all active:scale-[0.97] hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Tentar novamente
        </button>
      )}
    </motion.div>
  )
}
