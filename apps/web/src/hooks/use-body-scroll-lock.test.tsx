import { type ReactElement, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  auditScrollLock,
  forceReleaseScrollLock,
  useBodyScrollLock,
  useOverlayPresence,
} from './use-body-scroll-lock'

function ScrollLockHarness({
  locked,
  withOverlay = true,
}: {
  locked: boolean
  withOverlay?: boolean
}) {
  useBodyScrollLock(locked)
  useOverlayPresence(withOverlay && locked)
  return null
}

function renderHarness(element: ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)

  act(() => {
    root.render(element)
  })

  return {
    rerender(next: ReactElement) {
      act(() => {
        root.render(next)
      })
    },
    unmount() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    forceReleaseScrollLock()
  })

  afterEach(() => {
    forceReleaseScrollLock()
  })

  it('locks and unlocks the body while an overlay is mounted', () => {
    const { rerender, unmount } = renderHarness(<ScrollLockHarness locked={true} />)

    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<ScrollLockHarness locked={false} />)

    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')

    unmount()

    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')
  })

  it('releases orphaned locks when no overlay owner remains', () => {
    const { unmount } = renderHarness(<ScrollLockHarness locked={true} withOverlay={false} />)

    expect(document.body.style.position).toBe('fixed')

    auditScrollLock()

    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')

    unmount()
  })
})
