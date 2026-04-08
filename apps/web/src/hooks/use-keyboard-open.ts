import { useEffect, useState } from 'react'

/**
 * Hook to detect if the virtual keyboard (iOS/Android) is open.
 * Listens to the VisualViewport API to determine visibility based on height changes.
 */
export function useIsKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let baselineH = vv.height

    const check = () => {
      // If viewport grows (keyboard closed or device rotated), update baseline
      if (vv.height > baselineH) {
        baselineH = vv.height
      }

      // If height shrank significantly from baseline, keyboard is likely open
      setIsOpen(baselineH - vv.height > 50)
    }

    vv.addEventListener('resize', check)
    window.addEventListener('resize', check)
    check() // Initial check

    return () => {
      vv.removeEventListener('resize', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  return isOpen
}
