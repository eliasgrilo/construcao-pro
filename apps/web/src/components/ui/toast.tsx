import { type ToastInput, useToast, useToastStore } from '@/stores/toast-store'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

// Re-export useToast so existing call sites don't need to change their import path
export { useToast }
export type { ToastInput }

const icons = {
  default: <Info className="h-5 w-5 text-primary" />,
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  error: <XCircle className="h-5 w-5 text-destructive" />,
}

/** Renders the toast stack — place once near the root (e.g. AppLayout or App). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-2 left-2 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 sm:w-[360px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="pointer-events-auto rounded-2xl border bg-card/95 backdrop-blur-xl shadow-xl shadow-black/10 p-4 flex items-start gap-3"
          >
            <div className="flex-shrink-0 mt-0.5">{icons[t.variant ?? 'default']}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">{t.title}</p>
              {t.description && (
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  removeToast(t.id)
                }}
                className="flex-shrink-0 self-center text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors px-1 py-0.5 rounded"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Fechar notificação"
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * @deprecated Use <Toaster /> at the root level. ToastProvider is kept for
 * backwards compatibility but is now a no-op wrapper — no Context involved.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
