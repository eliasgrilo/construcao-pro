/**
 * ZoomablePdfViewer — pdf.js canvas rendering with iOS Quick Look–level
 * pinch/wheel/double-tap zoom. Mirrors ZoomableImageViewer's fit/pan/zoom
 * gesture pattern to guarantee the document opens fully fitted on screen
 * on every platform (iframe #view=Fit is ignored by mobile browsers —
 * that is the "zoomed in on open" bug this component replaces).
 *
 * All transform state lives in refs — zero re-renders during gestures.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const PDFJS_VERSION = '4.10.38'
const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`
const STANDARD_FONTS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`

/* ── Config ── */

const MAX_ZOOM = 6
const FIT_MARGIN = 0.98
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_ZOOM = 2.4
const WHEEL_SENSITIVITY = 0.002
const SNAP_MS = 280
const SNAP_EASE = 'cubic-bezier(0.25,0.1,0.25,1)'
const PAGE_GAP = 12
const CANVAS_MAX_PIXEL_RATIO = 2
const RENDER_WIDTH_MIN = 900
const RENDER_WIDTH_MAX = 1400
const RENDER_WIDTH_FACTOR = 1.5

interface Props {
  src: string
  alt: string
  fitMargin?: number
  contentInsets?: { top?: number; bottom?: number; left?: number; right?: number }
}

interface Transform {
  zoom: number
  panX: number
  panY: number
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function ZoomablePdfViewer({ src, alt, fitMargin = FIT_MARGIN, contentInsets }: Props) {
  const inT = contentInsets?.top ?? 0
  const inB = contentInsets?.bottom ?? 0
  const inL = contentInsets?.left ?? 0
  const inR = contentInsets?.right ?? 0

  const cRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Base size of the rendered page stack (at fit scale = 1) */
  const baseW = useRef(0)
  const baseH = useRef(0)
  const fitZ = useRef(1)
  const tr = useRef<Transform>({ zoom: 1, panX: 0, panY: 0 })
  const busy = useRef(false)
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

  /* ── Paint ── */
  const paint = useCallback((anim: boolean) => {
    const el = stackRef.current
    if (!el || !baseW.current) return
    const { zoom, panX, panY } = tr.current
    const s = zoom / fitZ.current
    el.style.transform = `translate(-50%,-50%) translate(${panX}px,${panY}px) scale(${s})`
    el.style.transition = anim ? `transform ${SNAP_MS}ms ${SNAP_EASE}` : 'none'
    const c = cRef.current
    if (c) c.style.cursor = zoom > fitZ.current * 1.02 ? 'grab' : 'default'
  }, [])

  /* ── Bound pan ── */
  const bound = useCallback((px: number, py: number, z: number) => {
    const c = cRef.current
    if (!c) return { x: px, y: py }
    const cw = c.clientWidth
    const ch = c.clientHeight
    const dw = baseW.current * z
    const dh = baseH.current * z
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

  /* ── Snap ── */
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

  /* ── Double-tap ── */
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

  /* ── Apply fit (called after render & on resize) ── */
  const applyFit = useCallback(() => {
    const c = cRef.current
    const el = stackRef.current
    if (!c || !el || !baseW.current) return
    const cw = c.clientWidth - inL - inR
    const ch = c.clientHeight - inT - inB
    if (cw <= 0 || ch <= 0) {
      pendingFit.current = true
      return
    }
    fitZ.current = Math.min(cw / baseW.current, ch / baseH.current) * fitMargin
    const centerOffsetX = (inL - inR) / 2
    const centerOffsetY = (inT - inB) / 2
    tr.current = { zoom: fitZ.current, panX: centerOffsetX, panY: centerOffsetY }
    paint(false)
    el.style.opacity = '1'
  }, [paint, fitMargin, inT, inB, inL, inR])

  /* ── Load PDF & render pages ── */
  useEffect(() => {
    let cancelled = false
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null

    setReady(false)
    setProgress(0)
    setError(null)
    baseW.current = 0
    baseH.current = 0
    fitZ.current = 1
    pendingFit.current = false
    tr.current = { zoom: 1, panX: 0, panY: 0 }

    const stack = stackRef.current
    if (stack) {
      stack.replaceChildren()
      stack.style.opacity = '0'
      stack.style.transition = 'none'
      stack.style.width = '0px'
      stack.style.height = '0px'
    }

    async function run() {
      try {
        loadingTask = pdfjsLib.getDocument({
          url: src,
          cMapUrl: CMAP_URL,
          cMapPacked: true,
          standardFontDataUrl: STANDARD_FONTS_URL,
          withCredentials: false,
        })
        loadingTask.onProgress = (p: { loaded: number; total: number }) => {
          if (cancelled) return
          if (p.total > 0) setProgress(Math.min(99, Math.round((p.loaded / p.total) * 100)))
        }
        const pdf = await loadingTask.promise
        if (cancelled) return

        const c = cRef.current
        const containerW = c ? c.clientWidth - inL - inR : 1000
        const targetWidth = clamp(containerW * RENDER_WIDTH_FACTOR, RENDER_WIDTH_MIN, RENDER_WIDTH_MAX)
        const dpr = clamp(window.devicePixelRatio || 1, 1, CANVAS_MAX_PIXEL_RATIO)

        const stackEl = stackRef.current
        if (!stackEl) return

        let maxW = 0
        let totalH = 0

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const v1 = page.getViewport({ scale: 1 })
          const renderScale = targetWidth / v1.width
          const viewport = page.getViewport({ scale: renderScale })
          const cssW = viewport.width
          const cssH = viewport.height

          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(cssW * dpr)
          canvas.height = Math.floor(cssH * dpr)
          canvas.style.width = `${cssW}px`
          canvas.style.height = `${cssH}px`
          canvas.style.display = 'block'
          canvas.style.background = '#fff'
          canvas.style.borderRadius = '2px'
          canvas.style.boxShadow = '0 6px 24px rgba(0,0,0,0.35)'
          if (i < pdf.numPages) canvas.style.marginBottom = `${PAGE_GAP}px`

          const ctx = canvas.getContext('2d', { alpha: false })
          if (!ctx) continue
          ctx.scale(dpr, dpr)

          await page.render({ canvasContext: ctx, viewport }).promise
          if (cancelled) return

          stackEl.appendChild(canvas)

          if (cssW > maxW) maxW = cssW
          totalH += cssH + (i < pdf.numPages ? PAGE_GAP : 0)
          setProgress(Math.min(99, Math.round((i / pdf.numPages) * 100)))
        }

        if (cancelled) return

        baseW.current = maxW
        baseH.current = totalH
        stackEl.style.width = `${maxW}px`
        stackEl.style.height = `${totalH}px`

        setReady(true)
        setProgress(100)
        requestAnimationFrame(() => {
          if (!cancelled) applyFit()
        })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar PDF'
        setError(message)
      }
    }

    run()

    return () => {
      cancelled = true
      if (loadingTask) {
        loadingTask.destroy().catch(() => {
          /* ignore cancellation errors */
        })
      }
    }
  }, [src, applyFit, inL, inR])

  /* ── ResizeObserver — orientation + pending fit ── */
  useEffect(() => {
    const c = cRef.current
    if (!c) return
    const ro = new ResizeObserver(() => {
      if (!baseW.current) return
      if (pendingFit.current) {
        pendingFit.current = false
        applyFit()
        return
      }
      if (g.current.on) return
      applyFit()
    })
    ro.observe(c)
    return () => ro.disconnect()
  }, [applyFit])

  /* ── Wheel ── */
  useEffect(() => {
    const c = cRef.current
    if (!c) return
    const fn = (e: WheelEvent) => {
      e.preventDefault()
      if (busy.current || !baseW.current) return
      zoomAt(tr.current.zoom * (1 - e.deltaY * WHEEL_SENSITIVITY), e.clientX, e.clientY)
    }
    c.addEventListener('wheel', fn, { passive: false })
    return () => c.removeEventListener('wheel', fn)
  }, [zoomAt])

  /* ── Pointer events ── */
  const onDown = useCallback(
    (e: React.PointerEvent) => {
      if (busy.current || !baseW.current) return
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
        background: '#0b0b0d',
      }}
    >
      <div
        ref={stackRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%) scale(1)',
          transformOrigin: 'center center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 0,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />

      {!ready && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            pointerEvents: 'none',
          }}
        >
          <div className="h-9 w-9 rounded-full border-[2.5px] border-white/15 border-t-white/70 animate-spin" />
          <p className="text-[13px] text-white/35">
            {progress > 0 ? `Carregando PDF... ${progress}%` : 'Carregando PDF...'}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div className="max-w-sm rounded-2xl border border-white/10 bg-black/60 p-5 text-center backdrop-blur-xl">
            <p className="text-[15px] font-medium text-white">Não foi possível abrir o PDF.</p>
            <p className="mt-2 text-[13px] text-white/55">{error}</p>
            <div className="mt-4 flex justify-center">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
              >
                Abrir PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
