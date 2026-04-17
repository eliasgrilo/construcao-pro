import { useEffect, useRef } from 'react'

// Track lock owners by unique string IDs instead of a numeric counter.
// A Set can never go negative and is self-deduplicating.
const lockOwners = new Set<string>()
const overlayOwners = new Set<string>()
let idCounter = 0
let savedScrollY = 0
let isDomLocked = false
let savedBodyPosition = ''
let savedBodyTop = ''
let savedBodyLeft = ''
let savedBodyRight = ''
let savedBodyMinHeight = ''

/**
 * iOS Safari ignores `overflow: hidden` on html/body — the viewport still
 * scrolls behind modals/drawers. The only reliable technique is pinning
 * the body with `position: fixed` and restoring scroll position on unlock.
 */
function applyLock() {
  if (isDomLocked) return
  savedScrollY = window.scrollY
  const body = document.body
  savedBodyPosition = body.style.position
  savedBodyTop = body.style.top
  savedBodyLeft = body.style.left
  savedBodyRight = body.style.right
  savedBodyMinHeight = body.style.minHeight
  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  // Ensure body extends to the viewport bottom even when offset by savedScrollY,
  // preventing a visible gap at the bottom behind the drawer backdrop.
  body.style.minHeight = `calc(100dvh + ${savedScrollY}px)`
  isDomLocked = true
}

function releaseLock() {
  if (!isDomLocked) return
  const body = document.body
  const scrollYToRestore = savedScrollY
  body.style.position = savedBodyPosition
  body.style.top = savedBodyTop
  body.style.left = savedBodyLeft
  body.style.right = savedBodyRight
  body.style.minHeight = savedBodyMinHeight
  isDomLocked = false
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollYToRestore)
  })
}

function syncLock() {
  if (lockOwners.size > 0) {
    applyLock()
  } else {
    releaseLock()
  }
}

function createOwnerId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

export function useBodyScrollLock(isLocked: boolean, ownerId?: string) {
  const ownerRef = useRef(ownerId ?? createOwnerId('lock'))

  useEffect(() => {
    if (isLocked) {
      lockOwners.add(ownerRef.current)
      syncLock()
    } else {
      lockOwners.delete(ownerRef.current)
      syncLock()
    }

    return () => {
      lockOwners.delete(ownerRef.current)
      syncLock()
    }
  }, [isLocked])
}

export function useOverlayPresence(isOpen: boolean, ownerId?: string) {
  const ownerRef = useRef(ownerId ?? createOwnerId('overlay'))

  useEffect(() => {
    if (isOpen) {
      overlayOwners.add(ownerRef.current)
    } else {
      overlayOwners.delete(ownerRef.current)
    }

    return () => {
      overlayOwners.delete(ownerRef.current)
    }
  }, [isOpen])
}

/**
 * Emergency escape hatch: if lockOwners leaks (e.g. component unmounts
 * during animation), this resets everything. Called by Modal on forced close.
 */
export function forceReleaseScrollLock() {
  lockOwners.clear()
  overlayOwners.clear()
  releaseLock()
}

/**
 * Safety valve: verify no modals exist in DOM but lock is still active.
 * Call on route changes to prevent orphaned locks.
 */
export function auditScrollLock() {
  if (lockOwners.size === 0) return
  if (overlayOwners.size === 0) {
    lockOwners.clear()
    releaseLock()
    return
  }
  syncLock()
}
