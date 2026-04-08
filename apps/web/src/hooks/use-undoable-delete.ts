import { useToast } from '@/components/ui/toast'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Wraps any async delete fn with a 5-second undo window.
 * Shows a toast immediately; mutation fires after the delay
 * unless the user clicks "Desfazer".
 */
export function useUndoableDelete<TId = string>(
  deleteFn: (id: TId) => Promise<void>,
  messages: {
    pending: string
    undone?: string
    error?: string
  },
  delayMs = 5000,
) {
  const { toast } = useToast()
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Clear all pending timers on unmount to prevent post-unmount state updates
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer)
      timersRef.current.clear()
    }
  }, [])

  const deleteWithUndo = useCallback(
    (id: TId) => {
      const key = String(id)

      // Cancel any pending delete for same id (double-click guard)
      const existing = timersRef.current.get(key)
      if (existing) {
        clearTimeout(existing)
        timersRef.current.delete(key)
      }

      let cancelled = false

      toast({
        title: messages.pending,
        duration: delayMs,
        action: {
          label: 'Desfazer',
          onClick: () => {
            cancelled = true
            clearTimeout(timersRef.current.get(key))
            timersRef.current.delete(key)
            if (messages.undone) {
              toast({ title: messages.undone, variant: 'default', duration: 2500 })
            }
          },
        },
      })

      const timer = setTimeout(async () => {
        timersRef.current.delete(key)
        if (cancelled) return
        try {
          await deleteFn(id)
        } catch {
          if (messages.error) {
            toast({ title: messages.error, variant: 'error' })
          }
        }
      }, delayMs)

      timersRef.current.set(key, timer)
    },
    [deleteFn, messages, delayMs, toast],
  )

  return { deleteWithUndo }
}
