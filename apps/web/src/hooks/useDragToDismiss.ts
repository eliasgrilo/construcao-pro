import type React from 'react'
import { useEffect, useRef } from 'react'

interface DragConfig {
  onDismiss: () => void
  threshold?: number // px mínimo para dismissar — default: 120
  velocityThreshold?: number // px/ms para dismiss rápido — default: 0.5
}

/**
 * Interactive element selectors that must NOT be intercepted by the drag handler.
 * Previously, onPointerDown called setPointerCapture on every tap inside the
 * modal container, stealing focus from inputs and making them unresponsive on
 * first tap. We check the event target and skip drag initiation for any
 * interactive element.
 */
const INTERACTIVE_SELECTOR =
  'input, textarea, select, button, a, [contenteditable], [role="button"], [role="option"], [role="combobox"], [role="listbox"]'

/**
 * Emits a brief haptic pulse via the Web Vibration API.
 * Falls back silently on unsupported browsers (desktop, some Android).
 *
 * style: 'light'  → 1ms pulse  (modal open, light confirmation)
 *        'medium' → 6ms pulse  (dismiss gesture)
 */
function haptic(style: 'light' | 'medium') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  navigator.vibrate(style === 'light' ? [1] : [6])
}

export function useDragToDismiss(config: DragConfig) {
  // Rastreia com useRef, não useState — evita re-renders durante o drag
  const startY = useRef(0)
  const currentY = useRef(0)
  const startTime = useRef(0)
  const isDragging = useRef(false)
  const elementRef = useRef<HTMLDivElement>(null)
  // Track the resetTransform timeout so we can cancel it on unmount —
  // prevents stale DOM writes after portal removal.
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the ongoing --drag-progress rAF loop so a second call to
  // resetTransform cancels the previous one instead of running in parallel.
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [])

  // Aplica transform direto no DOM durante o drag
  // Isso mantém 60-120fps — React state causaria jank
  const applyTransform = (y: number) => {
    if (!elementRef.current) return
    const resistance = y < 0 ? Math.abs(y) * 0.1 : 0 // Resistência ao arrastar para cima
    const clampedY = Math.max(-resistance, y)

    elementRef.current.style.transform = `translateY(${clampedY}px)`

    // Escurece o backdrop proporcionalmente ao drag progress.
    // CSS uses --drag-progress to interpolate overlay background opacity.
    const progress = Math.min(1, clampedY / 300)
    document.documentElement.style.setProperty('--drag-progress', String(progress))
  }

  const resetTransform = () => {
    if (!elementRef.current) return
    // Spring snap-back matching Apple's UIPanGestureRecognizer spring
    elementRef.current.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
    elementRef.current.style.transform = 'translateY(0)'

    // Animate --drag-progress back to 0 by interpolating via rAF steps.
    // Setting it directly to "0" would cause the backdrop to snap instantly.
    const startProgress = Number(
      document.documentElement.style.getPropertyValue('--drag-progress') || '0',
    )
    const startTs = performance.now()
    const DURATION = 400 // matches the transform transition above

    // Cancel any previous animation loop before starting a new one.
    // Without this, rapid gestures would spawn multiple simultaneous loops
    // that fight each other over --drag-progress.
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    const animateProgress = (now: number) => {
      const elapsed = now - startTs
      const t = Math.min(1, elapsed / DURATION)
      // Ease-out deceleration
      const eased = 1 - (1 - t) ** 3
      const current = startProgress * (1 - eased)
      document.documentElement.style.setProperty('--drag-progress', String(current))
      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(animateProgress)
      } else {
        rafIdRef.current = null
      }
    }
    rafIdRef.current = requestAnimationFrame(animateProgress)

    // Clear any previous timer before setting a new one
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current)
    }
    // Limpa após a animação
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null
      if (elementRef.current) {
        elementRef.current.style.transition = ''
      }
    }, 400)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // Do NOT intercept pointer events on interactive elements.
    // This preserves native focus/tap behavior for inputs, buttons, etc.
    const target = e.target as HTMLElement
    if (target.closest(INTERACTIVE_SELECTOR)) {
      return
    }

    isDragging.current = true
    startY.current = e.clientY
    currentY.current = 0
    startTime.current = Date.now()
    elementRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const deltaY = e.clientY - startY.current
    currentY.current = deltaY
    applyTransform(deltaY)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false

    const deltaY = currentY.current
    const deltaTime = Date.now() - startTime.current
    const velocity = deltaY / deltaTime // px/ms

    const shouldDismiss =
      deltaY > (config.threshold ?? 120) || velocity > (config.velocityThreshold ?? 0.5)

    if (shouldDismiss) {
      // Medium haptic BEFORE calling onDismiss — dismiss animation and haptic
      // must fire together, not after the component unmounts.
      haptic('medium')
      document.documentElement.style.setProperty('--drag-progress', '0')
      config.onDismiss()
    } else {
      resetTransform()
      // Light snap-back confirmation
      haptic('light')
    }
  }

  // Reset drag state and transform when pointer is cancelled by the system
  // (e.g., incoming call, notification, or browser gesture on iOS/Android).
  const onPointerCancel = (_e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    currentY.current = 0
    resetTransform()
  }

  return {
    ref: elementRef,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
