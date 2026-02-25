import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
    id: string
    title: string
    description?: string
    variant?: 'default' | 'success' | 'warning' | 'error'
    duration?: number
}

interface ToastContextType {
    toast: (t: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((t: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).slice(2, 9)
        setToasts((prev) => [...prev, { ...t, id }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x.id !== id))
        }, t.duration || 4000)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
    }, [])

    const icons = {
        default: <Info className="h-5 w-5 text-primary" />,
        success: <CheckCircle2 className="h-5 w-5 text-success" />,
        warning: <AlertTriangle className="h-5 w-5 text-warning" />,
        error: <XCircle className="h-5 w-5 text-destructive" />,
    }

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[360px] pointer-events-none">
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
                            <div className="flex-shrink-0 mt-0.5">
                                {icons[t.variant || 'default']}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold">{t.title}</p>
                                {t.description && (
                                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}
