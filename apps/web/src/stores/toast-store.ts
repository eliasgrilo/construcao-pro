import { generateId } from '@/lib/utils'
import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  duration?: number
  action?: { label: string; onClick: () => void }
}

export type ToastInput = Omit<Toast, 'id'>

interface ToastState {
  toasts: Toast[]
  addToast: (input: ToastInput) => void
  removeToast: (id: string) => void
}

// Module-level timer map — avoids the need for useRef inside a store
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (input) => {
    const id = generateId('toast')
    set((state) => ({ toasts: [...state.toasts, { ...input, id }] }))
    // duration: 0 means "persist until manually dismissed" — no auto-remove timer.
    const ms = input.duration ?? 4000
    if (ms > 0) {
      const timer = setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        timers.delete(id)
      }, ms)
      timers.set(id, timer)
    }
  },
  removeToast: (id) => {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Convenience hook — same API as before, works anywhere without a Provider. */
export function useToast() {
  const addToast = useToastStore((s) => s.addToast)
  return { toast: addToast }
}
