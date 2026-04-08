import { type RefObject, useCallback, useEffect, useState } from 'react'

/**
 * Registers all form inputs and enables Anterior/Próximo/Concluir navigation
 * via the KeyboardToolbar.
 *
 * SCROLL STRATEGY:
 *   Uses the same manual scrollTop delta approach as use-scroll-focused-input.ts
 *   (no scrollIntoView) so the focused field always clears the visible area with
 *   a 16pt breathing room margin — matching Apple's minimum tap target guideline.
 *
 *   scrollIntoView({ block: 'center' }) can scroll the field behind the keyboard
 *   on some iOS versions because it measures from the layout viewport, not the
 *   visual viewport (which is shrunk by the keyboard).
 *
 * FIELD STATE:
 *   Listens to focusin/focusout events to track which field is currently active.
 *   Returns canGoPrev / canGoNext so the KeyboardToolbar can disable the
 *   Anterior/Próximo buttons on the first and last fields respectively.
 */
export function useFormFieldNavigation(formRef: RefObject<HTMLElement | null>) {
  const [canGoPrev, setCanGoPrev] = useState(false)
  const [canGoNext, setCanGoNext] = useState(false)

  const getFields = useCallback(
    () =>
      Array.from(
        formRef.current?.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), textarea:not([disabled])',
        ) ?? [],
      ) as HTMLElement[],
    [formRef],
  )

  /**
   * Find the nearest scrollable ancestor of `el`.
   * Does NOT check scrollHeight > clientHeight because at focus-time the dialog
   * may not have reflowed to its post-keyboard size yet.
   */
  const findScrollableAncestor = (el: HTMLElement): HTMLElement | null => {
    let parent = el.parentElement
    while (parent && parent !== document.body) {
      const { overflow, overflowY } = getComputedStyle(parent)
      if (/auto|scroll/.test(overflow + overflowY)) return parent
      parent = parent.parentElement
    }
    return null
  }

  /**
   * Scroll the nearest scrollable container so `el` clears the container's
   * bottom edge by at least BREATHING_ROOM px (= 16pt, Apple minimum).
   * Runs after a double-rAF to ensure layout has settled post-keyboard.
   */
  const scrollFieldIntoView = (el: HTMLElement) => {
    const BREATHING_ROOM = 16

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollable = findScrollableAncestor(el)
        if (!scrollable) return

        const containerBottom = scrollable.getBoundingClientRect().bottom
        const elRect = el.getBoundingClientRect()

        if (elRect.bottom > containerBottom - BREATHING_ROOM) {
          const delta = elRect.bottom - containerBottom + BREATHING_ROOM
          scrollable.scrollBy({ top: delta, behavior: 'smooth' })
        }
      })
    })
  }

  /** Recompute canGoPrev / canGoNext from the currently active element. */
  const refreshState = useCallback(() => {
    const fields = getFields()
    if (!fields.length) {
      setCanGoPrev(false)
      setCanGoNext(false)
      return
    }
    const current = document.activeElement as HTMLElement
    const index = fields.indexOf(current)
    if (index < 0) {
      // No form field is focused — disable both buttons
      setCanGoPrev(false)
      setCanGoNext(false)
    } else {
      setCanGoPrev(index > 0)
      setCanGoNext(index < fields.length - 1)
    }
  }, [getFields])

  // Track focus changes inside the document so we always show the correct
  // Anterior/Próximo button states as the user moves between fields.
  useEffect(() => {
    document.addEventListener('focusin', refreshState, true)
    document.addEventListener('focusout', refreshState, true)
    return () => {
      document.removeEventListener('focusin', refreshState, true)
      document.removeEventListener('focusout', refreshState, true)
    }
  }, [refreshState])

  const focusField = (index: number) => {
    const fields = getFields()
    const target = fields[index]
    if (!target) return
    target.focus()
    scrollFieldIntoView(target)
  }

  const focusNext = () => {
    const fields = getFields()
    if (!fields.length) return
    const current = document.activeElement as HTMLElement
    const index = fields.indexOf(current)
    if (index >= 0 && index < fields.length - 1) {
      focusField(index + 1)
    }
  }

  const focusPrev = () => {
    const fields = getFields()
    if (!fields.length) return
    const current = document.activeElement as HTMLElement
    const index = fields.indexOf(current)
    if (index > 0) {
      focusField(index - 1)
    }
  }

  const dismiss = () => {
    ;(document.activeElement as HTMLElement)?.blur()
  }

  return { focusNext, focusPrev, dismiss, canGoPrev, canGoNext }
}
