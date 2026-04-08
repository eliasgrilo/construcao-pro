import { useEffect } from 'react'

/**
 * useVisualViewport — keyboard detection and scroll-to-input.
 *
 * With `interactive-widget=resizes-content`, the LAYOUT viewport shrinks when
 * the keyboard opens. This means:
 *   - `position: fixed; inset: 0` automatically covers only the visible area
 *   - `100dvh` dynamically updates
 *   - No JS needed for overlay positioning
 *
 * This hook only handles:
 *   1. Detecting keyboard open/close (sets --modal-pb to remove safe-area gap)
 *   2. Scrolling the focused input into view within modal scroll containers
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let baselineH = vv.height
    let raf: number | null = null
    let prevKbOpen = false

    const update = () => {
      raf = null

      // Recalibrate baseline when viewport grows (keyboard closed, rotation)
      if (vv.height > baselineH) {
        baselineH = vv.height
      }

      const kbOpen = baselineH - vv.height > 80

      const root = document.documentElement

      // --modal-pb: when keyboard is open, zero out safe-area-inset-bottom
      // padding so there's no gap between modal footer and keyboard
      if (kbOpen) {
        root.style.setProperty('--modal-pb', '0px')
        root.style.setProperty('--keyboard-visible', '1')
      } else {
        root.style.removeProperty('--modal-pb')
        root.style.setProperty('--keyboard-visible', '0')
      }

      // Scroll focused input into modal when keyboard just opened
      if (kbOpen && !prevKbOpen) {
        setTimeout(() => scrollActiveElementIntoModal(), 300)
      }

      prevKbOpen = kbOpen
    }

    const schedule = () => {
      if (raf !== null) return
      raf = requestAnimationFrame(update)
    }

    /**
     * Scroll the currently focused element into view within its nearest
     * scrollable ancestor. Uses manual scrollTop math instead of native
     * scrollIntoView, which breaks on iOS with position:fixed overlays.
     */
    function scrollActiveElementIntoModal() {
      const el = document.activeElement
      if (!el || el === document.body || el === document.documentElement) return
      if (
        !(
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        )
      )
        return

      const container = findScrollContainer(el)
      if (!container) return

      const elRect = el.getBoundingClientRect()
      const contRect = container.getBoundingClientRect()

      // Already visible? Skip.
      const BREATHING = 24
      if (elRect.top >= contRect.top + BREATHING && elRect.bottom <= contRect.bottom - BREATHING) {
        return
      }

      // Position in upper third for context (shows labels above the input)
      const elTopInScroll = elRect.top - contRect.top + container.scrollTop
      const target = elTopInScroll - contRect.height * 0.35
      const maxScroll = container.scrollHeight - container.clientHeight
      const clamped = Math.max(0, Math.min(target, maxScroll))

      container.scrollTo({ top: clamped, behavior: 'smooth' })
    }

    function findScrollContainer(el: Element): HTMLElement | null {
      let node = el.parentElement
      while (node && node !== document.body) {
        const { overflowY } = getComputedStyle(node)
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          node.scrollHeight > node.clientHeight
        ) {
          return node
        }
        node = node.parentElement
      }
      return null
    }

    // When switching between inputs with keyboard open, scroll new input into view
    const handleFocusIn = (e: FocusEvent) => {
      if (
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
      )
        return
      // Small delay to let layout settle
      setTimeout(() => scrollActiveElementIntoModal(), 150)
    }

    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    document.addEventListener('focusin', handleFocusIn)
    schedule()

    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('focusin', handleFocusIn)

      const root = document.documentElement
      root.style.removeProperty('--modal-pb')
      root.style.removeProperty('--keyboard-visible')
    }
  }, [])
}
