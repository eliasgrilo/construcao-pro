/**
 * ZoomableImageViewer — pinch/wheel/double-tap zoom for web.
 *
 * Fit-to-container is handled natively by CSS (`object-fit: contain` +
 * `max-width/max-height: 100%`). This eliminates the entire class of
 * race conditions that caused the "zoomed in on open" bug — the browser
 * lays out the image at fit size before the first paint, no JS math,
 * no ResizeObserver dance, no cached-image races.
 *
 * JS is responsible only for zoom levels >= 1 (user-initiated zoom in)
 * applied as a pure `transform: scale(z) translate(...)` on top of the
 * CSS-fitted base. All transform state lives in refs — zero re-renders
 * during gestures.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

/* ── Config ── */

const MAX_ZOOM = 8
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_ZOOM = 2.5
const WHEEL_SENSITIVITY = 0.002
const SNAP_MS = 280
const SNAP_EASE = 'cubic-bezier(0.25,0.1,0.25,1)'

/* ── Types ── */

interface Props {
  src: string
  alt: string
  onLoad?: () => void
  onError?: () => void
  /** Kept for API compatibility — no longer used (CSS handles fit). */
  fitMargin?: number
  /** Padding that reduces the CSS fit area without shrinking the pannable container. */
  contentInsets?: { top?: number; bottom?: number; left?: number; right?: number }
}

export interface ZoomableImageViewerHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

interface Transform {
  zoom: number
  panX: number
  panY: number
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/* ── Component ── */

export const ZoomableImageViewer = forwardRef<ZoomableImageViewerHandle, Props>(
  function ZoomableImageViewer({ src, alt, onLoad, onError, contentInsets }, ref) {
    const inT = contentInsets?.top ?? 0
    const inB = contentInsets?.bottom ?? 0
    const inL = contentInsets?.left ?? 0
    const inR = contentInsets?.right ?? 0
    const cRef = useRef<HTMLDivElement>(null)
    const iRef = useRef<HTMLImageElement>(null)

    /* All mutable — zero re-renders during interaction.
     zoom: absolute scale where 1 = CSS-fitted size. Range [1, MAX_ZOOM]. */
    const tr = useRef<Transform>({ zoom: 1, panX: 0, panY: 0 })
    const ready = useRef(false)
    const busy = useRef(false)

    const g = useRef({
      on: false,
      ptrs: new Map<number, { x: number; y: number }>(),
      px0: 0,
      py0: 0,
      tx0: 0,
      ty0: 0,
      pd0: 0,
      pz0: 1,
      tap: 0,
    })

    /* ── Write current transform to the DOM ── */
    const paint = useCallback((anim: boolean) => {
      const img = iRef.current
      if (!img) return
      const { zoom, panX, panY } = tr.current
      img.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`
      const dur = `${SNAP_MS}ms`
      img.style.transition = anim
        ? `transform ${dur} ${SNAP_EASE}, opacity 0.25s ease`
        : 'opacity 0.25s ease'
      const c = cRef.current
      if (c) c.style.cursor = zoom > 1.02 ? 'grab' : 'default'
    }, [])

    /* ── Constrain pan based on current rendered image size × zoom ── */
    const bound = useCallback((px: number, py: number, z: number) => {
      const c = cRef.current
      const img = iRef.current
      if (!c || !img) return { x: px, y: py }
      const cw = c.clientWidth
      const ch = c.clientHeight
      // clientWidth/Height of the <img> = CSS-fitted size. Multiply by zoom for rendered size.
      const dw = img.clientWidth * z
      const dh = img.clientHeight * z
      const mx = dw <= cw ? 0 : (dw - cw) / 2
      const my = dh <= ch ? 0 : (dh - ch) / 2
      return { x: clamp(px, -mx, mx), y: clamp(py, -my, my) }
    }, [])

    /* ── Zoom toward screen point ── */
    const zoomAt = useCallback(
      (newZ: number, cx: number, cy: number) => {
        const c = cRef.current
        if (!c) return
        const r = c.getBoundingClientRect()
        const dx = cx - r.left - r.width / 2
        const dy = cy - r.top - r.height / 2
        const z = clamp(newZ, 1, MAX_ZOOM)
        const ratio = 1 - z / tr.current.zoom
        const { x, y } = bound(
          tr.current.panX + (dx - tr.current.panX) * ratio,
          tr.current.panY + (dy - tr.current.panY) * ratio,
          z,
        )
        tr.current = { zoom: z, panX: x, panY: y }
        paint(false)
      },
      [bound, paint],
    )

    /* ── Snap back ── */
    const snap = useCallback(() => {
      const cur = tr.current
      let changed = false
      if (cur.zoom < 1) {
        tr.current = { zoom: 1, panX: 0, panY: 0 }
        changed = true
      } else {
        const { x, y } = bound(cur.panX, cur.panY, cur.zoom)
        if (x !== cur.panX || y !== cur.panY) {
          tr.current = { ...cur, panX: x, panY: y }
          changed = true
        }
      }
      if (changed) {
        paint(true)
        busy.current = true
        setTimeout(() => {
          busy.current = false
        }, SNAP_MS)
      }
    }, [paint, bound])

    /* ── Double-tap toggle ── */
    const dblTap = useCallback(
      (cx: number, cy: number) => {
        if (tr.current.zoom > 1.05) {
          tr.current = { zoom: 1, panX: 0, panY: 0 }
        } else {
          const c = cRef.current
          if (!c) return
          const r = c.getBoundingClientRect()
          const dx = cx - r.left - r.width / 2
          const dy = cy - r.top - r.height / 2
          const z = clamp(DOUBLE_TAP_ZOOM, 1, MAX_ZOOM)
          const ratio = 1 - z / tr.current.zoom
          const { x, y } = bound(
            tr.current.panX + (dx - tr.current.panX) * ratio,
            tr.current.panY + (dy - tr.current.panY) * ratio,
            z,
          )
          tr.current = { zoom: z, panX: x, panY: y }
        }
        paint(true)
        busy.current = true
        setTimeout(() => {
          busy.current = false
        }, SNAP_MS)
        if (navigator.vibrate) navigator.vibrate(10)
      },
      [paint, bound],
    )

    /* ── Image onLoad — just reveal. CSS has already fitted it. ── */
    const handleLoad = useCallback(() => {
      const img = iRef.current
      if (!img) return
      ready.current = true
      tr.current = { zoom: 1, panX: 0, panY: 0 }
      img.style.transform = 'translate(0px,0px) scale(1)'
      img.style.transition = 'opacity 0.25s ease'
      img.style.opacity = '1'
      onLoad?.()
    }, [onLoad])

    /* ── Imperative handle for external zoom controls ── */
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const c = cRef.current
          if (!c || !ready.current) return
          const r = c.getBoundingClientRect()
          zoomAt(tr.current.zoom * 1.3, r.left + r.width / 2, r.top + r.height / 2)
        },
        zoomOut: () => {
          const c = cRef.current
          if (!c || !ready.current) return
          const r = c.getBoundingClientRect()
          const next = Math.max(tr.current.zoom / 1.3, 1)
          zoomAt(next, r.left + r.width / 2, r.top + r.height / 2)
          if (next <= 1.001) {
            tr.current = { zoom: 1, panX: 0, panY: 0 }
            paint(true)
          }
        },
        resetZoom: () => {
          if (!ready.current) return
          tr.current = { zoom: 1, panX: 0, panY: 0 }
          paint(true)
        },
      }),
      [zoomAt, paint],
    )

    /* ── Reset when src changes ── */
    useEffect(() => {
      const img = iRef.current
      if (img) {
        img.style.opacity = '0'
        img.style.transition = 'none'
        img.style.transform = 'translate(0px,0px) scale(1)'
      }
      ready.current = false
      tr.current = { zoom: 1, panX: 0, panY: 0 }
      g.current.tap = 0
    }, [src])

    /* ── Snap pan bounds on resize/orientation change ── */
    useEffect(() => {
      const c = cRef.current
      if (!c) return
      const ro = new ResizeObserver(() => {
        if (!ready.current || g.current.on) return
        const { x, y } = bound(tr.current.panX, tr.current.panY, tr.current.zoom)
        if (x !== tr.current.panX || y !== tr.current.panY) {
          tr.current = { ...tr.current, panX: x, panY: y }
          paint(false)
        }
      })
      ro.observe(c)
      return () => ro.disconnect()
    }, [bound, paint])

    /* ── Wheel (non-passive) ── */
    useEffect(() => {
      const c = cRef.current
      if (!c) return
      const fn = (e: WheelEvent) => {
        e.preventDefault()
        if (busy.current || !ready.current) return
        zoomAt(tr.current.zoom * (1 - e.deltaY * WHEEL_SENSITIVITY), e.clientX, e.clientY)
      }
      c.addEventListener('wheel', fn, { passive: false })
      return () => c.removeEventListener('wheel', fn)
    }, [zoomAt])

    /* ── Pointer events ── */
    const onDown = useCallback(
      (e: React.PointerEvent) => {
        if (busy.current || !ready.current) return
        const gs = g.current
        gs.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

        if (gs.ptrs.size === 1) {
          const now = Date.now()
          if (now - gs.tap < DOUBLE_TAP_MS) {
            dblTap(e.clientX, e.clientY)
            gs.tap = 0
            gs.on = false
            return
          }
          gs.tap = now
          gs.on = true
          gs.px0 = e.clientX
          gs.py0 = e.clientY
          gs.tx0 = tr.current.panX
          gs.ty0 = tr.current.panY
        } else if (gs.ptrs.size === 2) {
          const [a, b] = Array.from(gs.ptrs.values())
          gs.pd0 = Math.hypot(b.x - a.x, b.y - a.y)
          gs.pz0 = tr.current.zoom
          gs.on = true
        }
      },
      [dblTap],
    )

    const onMove = useCallback(
      (e: React.PointerEvent) => {
        const gs = g.current
        if (!gs.on) return
        gs.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (gs.ptrs.size === 2) {
          const [a, b] = Array.from(gs.ptrs.values())
          const d = Math.hypot(b.x - a.x, b.y - a.y)
          zoomAt(gs.pz0 * (d / gs.pd0), (a.x + b.x) / 2, (a.y + b.y) / 2)
        } else if (gs.ptrs.size === 1 && tr.current.zoom > 1.02) {
          tr.current.panX = gs.tx0 + (e.clientX - gs.px0)
          tr.current.panY = gs.ty0 + (e.clientY - gs.py0)
          paint(false)
        }
      },
      [zoomAt, paint],
    )

    const onUp = useCallback(
      (e: React.PointerEvent) => {
        const gs = g.current
        gs.ptrs.delete(e.pointerId)
        if (gs.ptrs.size === 0) {
          gs.on = false
          snap()
        } else if (gs.ptrs.size === 1) {
          const [pt] = Array.from(gs.ptrs.values())
          gs.px0 = pt.x
          gs.py0 = pt.y
          gs.tx0 = tr.current.panX
          gs.ty0 = tr.current.panY
        }
      },
      [snap],
    )

    return (
      <div
        ref={cRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label={alt}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          touchAction: 'none',
          cursor: 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: inT,
          paddingBottom: inB,
          paddingLeft: inL,
          paddingRight: inR,
          boxSizing: 'border-box',
        }}
      >
        {/* CSS-native fit: object-fit:contain + max-width/height:100% means the
          browser lays the image out at fit size on first paint — no JS race. */}
        <img
          ref={iRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={handleLoad}
          onError={onError}
          fetchPriority="high"
          decoding="async"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            transform: 'translate(0px,0px) scale(1)',
            transformOrigin: 'center center',
            opacity: 0,
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />
      </div>
    )
  },
)
