/**
 * ZoomableImageViewer — pinch/wheel/double-tap zoom for web.
 *
 * Critical: image visibility is controlled via direct DOM manipulation,
 * never React state. The <img> starts at opacity:0 and only becomes
 * visible inside the onLoad handler AFTER fit-zoom dimensions are
 * applied synchronously — eliminating the 1-frame flash at natural
 * size that caused the "zoomed in on open" bug on mobile.
 *
 * All transform state lives in refs — zero re-renders during gestures.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

/* ── Config ── */

const MAX_ZOOM = 8
const FIT_MARGIN = 0.98
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
  /** Fraction of container to fill (0–1). Default 0.98. */
  fitMargin?: number
  /**
   * Insets that reduce the *effective* fit area without shrinking the
   * interactive/pannable container.  The image is fitted to
   * (containerWidth − left − right) × (containerHeight − top − bottom)
   * but can still pan behind the inset zones when zoomed in.
   */
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
  function ZoomableImageViewer(
    { src, alt, onLoad, onError, fitMargin = FIT_MARGIN, contentInsets },
    ref,
  ) {
    const inT = contentInsets?.top ?? 0
    const inB = contentInsets?.bottom ?? 0
    const inL = contentInsets?.left ?? 0
    const inR = contentInsets?.right ?? 0
    const cRef = useRef<HTMLDivElement>(null)
    const iRef = useRef<HTMLImageElement>(null)

    /* All mutable — zero re-renders during interaction */
    const nw = useRef(0)
    const nh = useRef(0)
    const fitZ = useRef(1)
    const tr = useRef<Transform>({ zoom: 1, panX: 0, panY: 0 })
    const busy = useRef(false)
    /* Set when handleLoad fires but container has no dimensions yet (cached image race).
     ResizeObserver will apply the initial fit when dimensions become available. */
    const pendingFit = useRef(false)

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
      if (!img || !nw.current) return
      const { zoom, panX, panY } = tr.current
      // Use a single scale transform instead of setting width/height independently.
      // This guarantees aspect ratio is always preserved — the image can never
      // be "crushed" or distorted since scale is uniform on both axes.
      const s = zoom / fitZ.current
      img.style.transform = `translate(-50%,-50%) translate(${panX}px,${panY}px) scale(${s})`
      const dur = `${SNAP_MS}ms`
      img.style.transition = anim ? `transform ${dur} ${SNAP_EASE}` : 'none'
      const c = cRef.current
      if (c) c.style.cursor = zoom > fitZ.current * 1.02 ? 'grab' : 'default'
    }, [])

    /* ── Constrain pan ── */
    const bound = useCallback((px: number, py: number, z: number) => {
      const c = cRef.current
      if (!c) return { x: px, y: py }
      const cw = c.clientWidth
      const ch = c.clientHeight
      // Display size = base (nw*fitZ) * scale (z/fitZ) = nw*z
      const dw = nw.current * z
      const dh = nh.current * z
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
        // Min zoom is fitZ (never smaller than fit-to-container)
        const z = clamp(newZ, fitZ.current * 0.85, MAX_ZOOM)
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
      const restX = (inL - inR) / 2
      const restY = (inT - inB) / 2
      if (cur.zoom < fitZ.current) {
        tr.current = { zoom: fitZ.current, panX: restX, panY: restY }
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
    }, [paint, bound, inT, inB, inL, inR])

    /* ── Double-tap toggle ── */
    const dblTap = useCallback(
      (cx: number, cy: number) => {
        const restX = (inL - inR) / 2
        const restY = (inT - inB) / 2
        if (tr.current.zoom > fitZ.current * 1.05) {
          tr.current = { zoom: fitZ.current, panX: restX, panY: restY }
        } else {
          const c = cRef.current
          if (!c) return
          const r = c.getBoundingClientRect()
          const dx = cx - r.left - r.width / 2
          const dy = cy - r.top - r.height / 2
          const z = clamp(DOUBLE_TAP_ZOOM, fitZ.current, MAX_ZOOM)
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
      [paint, bound, inT, inB, inL, inR],
    )

    /* ══════════════════════════════════════════════════════════
     IMAGE ONLOAD — the critical path.
     Applies fit-zoom dimensions synchronously via DOM before
     making the image visible. No React state, no useEffect,
     no 1-frame flash at natural size.
     ══════════════════════════════════════════════════════════ */
    const handleLoad = useCallback(() => {
      const img = iRef.current
      const c = cRef.current
      if (!img || !c) return

      nw.current = img.naturalWidth
      nh.current = img.naturalHeight

      /* Defer to next animation frame so the browser has resolved flex
       layout before we read clientWidth/clientHeight. Without this,
       if the image is cached the handler fires before layout is committed,
       clientWidth === 0, fitZ stays at 1, and the image reveals at its
       full natural size (the "zoomed in on open" bug). */
      requestAnimationFrame(() => {
        const imgEl = iRef.current
        const cEl = cRef.current
        if (!imgEl || !cEl || !nw.current) return

        /* Effective area = container minus insets (overlay controls).
         The image is fitted to this smaller rect so it's fully visible
         between the top controls and bottom toolbar. */
        const cw = cEl.clientWidth - inL - inR
        const ch = cEl.clientHeight - inT - inB

        /* Root cause of the "zoomed in on open" bug:
         If the container has no dimensions yet (race between cached-image onLoad
         and modal mount/layout commit), do NOT reveal the image — mark it as
         pending and let ResizeObserver apply the fit once the container is laid out. */
        if (cw <= 0 || ch <= 0) {
          pendingFit.current = true
          return
        }

        fitZ.current = Math.min(cw / nw.current, ch / nh.current) * fitMargin

        /* Offset center so image sits in the middle of the *visible* area,
         not the middle of the full container.  shift = (inT - inB) / 2
         pushes the center down when top inset is larger (typical). */
        const centerOffsetY = (inT - inB) / 2
        const centerOffsetX = (inL - inR) / 2
        tr.current = { zoom: fitZ.current, panX: centerOffsetX, panY: centerOffsetY }

        /* Set base dimensions at fit-zoom level — these stay constant.
         All subsequent zooming uses CSS scale() relative to this base,
         which guarantees the aspect ratio can never be broken. */
        imgEl.style.width = `${nw.current * fitZ.current}px`
        imgEl.style.height = `${nh.current * fitZ.current}px`
        imgEl.style.transform = `translate(-50%,-50%) translate(${centerOffsetX}px,${centerOffsetY}px) scale(1)`
        imgEl.style.transition = 'opacity 0.25s ease'
        imgEl.style.opacity = '1'

        onLoad?.()
      })
    }, [onLoad, fitMargin, inT, inB, inL, inR])

    /* ── Imperative handle for external zoom controls ── */
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const c = cRef.current
          if (!c || !nw.current) return
          const r = c.getBoundingClientRect()
          zoomAt(tr.current.zoom * 1.3, r.left + r.width / 2, r.top + r.height / 2)
        },
        zoomOut: () => {
          const c = cRef.current
          if (!c || !nw.current) return
          const r = c.getBoundingClientRect()
          const next = Math.max(tr.current.zoom / 1.3, fitZ.current)
          zoomAt(next, r.left + r.width / 2, r.top + r.height / 2)
          if (next <= fitZ.current * 1.001) {
            tr.current = { zoom: fitZ.current, panX: (inL - inR) / 2, panY: (inT - inB) / 2 }
            paint(true)
          }
        },
        resetZoom: () => {
          if (!nw.current) return
          tr.current = { zoom: fitZ.current, panX: (inL - inR) / 2, panY: (inT - inB) / 2 }
          paint(true)
        },
      }),
      [zoomAt, paint, inT, inB, inL, inR],
    )

    /* ── Reset when src changes ── */
    useEffect(() => {
      const img = iRef.current
      if (img) {
        img.style.opacity = '0'
        img.style.transition = 'none'
        img.style.width = '0'
        img.style.height = '0'
      }
      nw.current = 0
      nh.current = 0
      fitZ.current = 1
      pendingFit.current = false
      tr.current = { zoom: 1, panX: 0, panY: 0 }
      g.current.tap = 0
    }, [src])

    /* ── ResizeObserver — handles orientation/resize AND the initial fit when
     the cached-image race leaves pendingFit=true ── */
    useEffect(() => {
      const c = cRef.current
      if (!c) return
      const ro = new ResizeObserver(() => {
        if (!nw.current) return
        const img = iRef.current
        const cw = c.clientWidth - inL - inR
        const ch = c.clientHeight - inT - inB
        if (cw <= 0 || ch <= 0) return

        const newFitZ = Math.min(cw / nw.current, ch / nh.current) * fitMargin
        fitZ.current = newFitZ
        const centerOffsetY = (inT - inB) / 2
        const centerOffsetX = (inL - inR) / 2

        if (pendingFit.current) {
          /* First time the container has real dimensions after a cached-image race.
           Apply initial fit and reveal the image (same as handleLoad's happy path). */
          pendingFit.current = false
          tr.current = { zoom: fitZ.current, panX: centerOffsetX, panY: centerOffsetY }
          if (img) {
            img.style.width = `${nw.current * fitZ.current}px`
            img.style.height = `${nh.current * fitZ.current}px`
            img.style.transform = `translate(-50%,-50%) translate(${centerOffsetX}px,${centerOffsetY}px) scale(1)`
            img.style.transition = 'opacity 0.25s ease'
            img.style.opacity = '1'
          }
          onLoad?.()
          return
        }

        /* Normal resize/orientation change — only refit if not mid-gesture */
        if (g.current.on) return
        tr.current = { zoom: fitZ.current, panX: centerOffsetX, panY: centerOffsetY }
        if (img) {
          img.style.width = `${nw.current * fitZ.current}px`
          img.style.height = `${nh.current * fitZ.current}px`
        }
        paint(false)
      })
      ro.observe(c)
      return () => ro.disconnect()
    }, [paint, fitMargin, inT, inB, inL, inR, onLoad])

    /* ── Wheel (non-passive) ── */
    useEffect(() => {
      const c = cRef.current
      if (!c) return
      const fn = (e: WheelEvent) => {
        e.preventDefault()
        if (busy.current || !nw.current) return
        zoomAt(tr.current.zoom * (1 - e.deltaY * WHEEL_SENSITIVITY), e.clientX, e.clientY)
      }
      c.addEventListener('wheel', fn, { passive: false })
      return () => c.removeEventListener('wheel', fn)
    }, [zoomAt])

    /* ── Pointer events ── */
    const onDown = useCallback(
      (e: React.PointerEvent) => {
        if (busy.current || !nw.current) return
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
        } else if (gs.ptrs.size === 1 && tr.current.zoom > fitZ.current * 1.02) {
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
        }}
      >
        {/* opacity:0 by default — only made visible synchronously in handleLoad
          AFTER correct dimensions are set. This is the mobile zoom fix. */}
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
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%) scale(1)',
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
