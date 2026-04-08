import { ChevronDown, ChevronUp } from 'lucide-react'
import React from 'react'
import styles from './KeyboardToolbar.module.css'

interface KeyboardToolbarProps {
  onNext?: () => void
  onPrev?: () => void
  onDone: () => void
  hasNext?: boolean
  hasPrev?: boolean
}

export function KeyboardToolbar({
  onNext,
  onPrev,
  onDone,
  hasNext = true,
  hasPrev = true,
}: KeyboardToolbarProps) {
  // O componente renderiza globalmente, mas sua opacidade/pointer-events
  // são controlados pelas CSS vars sincronizadas ao visualViewport.
  // Portanto, ele só aparece quando o teclado abre.

  return (
    <div className={styles.toolbar}>
      <div className={styles.navGroup}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault() // Evita perder foco antes de navegar
            onPrev?.()
          }}
          disabled={!hasPrev || !onPrev}
          className={styles.navButton}
          aria-label="Campo anterior"
        >
          <ChevronUp size={24} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onNext?.()
          }}
          disabled={!hasNext || !onNext}
          className={styles.navButton}
          aria-label="Próximo campo"
        >
          <ChevronDown size={24} strokeWidth={2.5} />
        </button>
      </div>

      <button
        type="button"
        onClick={onDone}
        className={styles.doneButton}
        aria-label="Concluir edição"
      >
        Concluído
      </button>
    </div>
  )
}
