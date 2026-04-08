import { useEffect, useRef } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

/**
 * Persists react-hook-form state to sessionStorage.
 * - Loads draft on mount (restores partial form data after refresh)
 * - Saves on change, debounced 400ms
 * - Call clearDraft() on successful submit to wipe the stored draft
 */
export function useFormDraft<T extends FieldValues>(form: UseFormReturn<T>, key: string) {
  const storageKey = `draft:${key}`
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasRestoredRef = useRef(false)

  // Load draft once per storage key — prevents reset loops on re-renders.
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true

    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<T>
      form.reset(draft as T, { keepDefaultValues: true })
    } catch {
      sessionStorage.removeItem(storageKey)
    }
  }, [form, storageKey])

  // Save on change, debounced
  useEffect(() => {
    const { unsubscribe } = form.watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(values))
        } catch {
          // sessionStorage quota exceeded — ignore
        }
      }, 400)
    })
    return () => {
      unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, storageKey])

  const clearDraft = () => sessionStorage.removeItem(storageKey)

  return { clearDraft }
}
