import { X } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock, useOverlayPresence } from '../../hooks/use-body-scroll-lock'
import { useDragToDismiss } from '../../hooks/useDragToDismiss'
import styles from './Modal.module.css'

type ModalState = 'closed' | 'open' | 'closing'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  snapPoint?: '50%' | '75%' | '95%'
  swipeToDismiss?: boolean
  accessibilityLabel?: string
  /** Remove default content padding — for custom layouts that control their own spacing */
  noPadding?: boolean
}

/**
 * Fire a single Web Vibration API pulse.
 * Silently no-ops on unsupported browsers (desktop, some Android).
 */
function haptic(style: 'light' | 'medium') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  navigator.vibrate(style === 'light' ? [1] : [6])
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  snapPoint,
  swipeToDismiss = true,
  accessibilityLabel,
  noPadding = false,
}: ModalProps) {
  const [internalState, setInternalState] = useState<ModalState>('closed')
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when modal is visible — prevents iOS background page scroll
  useBodyScrollLock(internalState !== 'closed')
  useOverlayPresence(internalState !== 'closed')

  // Track previous isOpen with a ref to detect true transitions.
  // Avoids potential re-render loop where the modal could get stuck between states.
  const prevIsOpenRef = useRef(isOpen)

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    if (isOpen && !wasOpen) {
      setInternalState('open')
      // Light haptic on open — matches UIImpactFeedbackGenerator(.light)
      haptic('light')
    } else if (!isOpen && wasOpen) {
      setInternalState('closing')
    }
  }, [isOpen])

  // Safety timeout: if exit animation doesn't fire animationEnd within 600ms,
  // force the modal closed. Prevents body scroll lock from leaking.
  useEffect(() => {
    if (internalState !== 'closing') return
    const timer = setTimeout(() => {
      setInternalState('closed')
    }, 600)
    return () => clearTimeout(timer)
  }, [internalState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && internalState === 'open') {
        onClose()
      }
    }
    if (internalState === 'open') {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [internalState, onClose])

  const { ref: dragRef, dragHandlers } = useDragToDismiss({
    onDismiss: onClose,
  })

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName === 'modalExit') {
      setInternalState('closed')
    }
  }

  if (internalState === 'closed') return null

  const handleBackdropTap = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Dismiss the keyboard BEFORE closing so it doesn't briefly flash
      // visible during the modal exit animation.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      onClose()
    }
  }

  const assignRefs = (node: HTMLDivElement | null) => {
    if (swipeToDismiss && dragRef) {
      ;(dragRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
    ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      data-state={internalState}
      onClick={handleBackdropTap}
    >
      <div
        className={`${styles.container} ${styles.modalContainer}`}
        data-state={internalState}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={accessibilityLabel}
        ref={assignRefs}
        onAnimationEnd={handleAnimationEnd}
        onFocusCapture={(e) => {
          // When an input receives focus inside this modal, scroll it into
          // the visible area of the .content scroll area.
          const target = e.target
          if (
            !(
              target instanceof HTMLInputElement ||
              target instanceof HTMLTextAreaElement ||
              target instanceof HTMLSelectElement
            )
          )
            return

          const contentEl = (containerRef.current?.querySelector(`.${styles.content}`) ??
            containerRef.current?.querySelector(`.${styles.contentNoPad}`)) as HTMLElement | null
          if (!contentEl || contentEl.scrollHeight <= contentEl.clientHeight) return

          // Delay to let layout settle (especially on keyboard open)
          setTimeout(() => {
            const elRect = target.getBoundingClientRect()
            const contRect = contentEl.getBoundingClientRect()

            // Skip if already visible (with breathing room for toolbar)
            if (elRect.top >= contRect.top + 16 && elRect.bottom <= contRect.bottom - 60) return

            // Position in upper third for context (shows label above)
            const elTopInScroll = elRect.top - contRect.top + contentEl.scrollTop
            const targetScroll = elTopInScroll - contRect.height * 0.35
            const maxScroll = contentEl.scrollHeight - contentEl.clientHeight
            const clamped = Math.max(0, Math.min(targetScroll, maxScroll))
            contentEl.scrollTo({ top: clamped, behavior: 'smooth' })
          }, 300)
        }}
        {...(swipeToDismiss ? dragHandlers : {})}
      >
        {swipeToDismiss && <div className={styles.handle} aria-hidden="true" />}

        {/* Only render the default header when the child does NOT own its layout.
            noPadding without a title means the child provides its own header + close button. */}
        {(!noPadding || title) && (
          <div className="flex justify-between items-center pt-5 px-5 shrink-0">
            {title ? (
              <h2
                id="modal-title"
                className="text-[19px] sm:text-[17px] font-semibold tracking-tight text-foreground"
                aria-live="polite"
              >
                {title}
              </h2>
            ) : (
              <div />
            )}

            <button
              onClick={onClose}
              className="h-11 w-11 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex-shrink-0"
              aria-label="Fechar"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className={noPadding ? styles.contentNoPad : styles.content}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
