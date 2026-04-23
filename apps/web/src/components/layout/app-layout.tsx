import { RealtimeStatusBanner } from '@/components/realtime-status-banner'
import { useRealtimeStore } from '@/stores/realtime-store'
import { useUIStore } from '@/stores/ui-store'
import { useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, setMobileMenuOpen } = useUIStore()
  const { pathname } = useLocation()
  const realtimeStatus = useRealtimeStore((s) => s.status)

  const sidebarW = sidebarCollapsed ? 72 : 260

  return (
    /**
     * --app-sb-w: CSS custom property read by .app-main in index.css.
     * @media (min-width:768px) { .app-main { margin-left: var(--app-sb-w) } }
     * On mobile the media query never fires → margin stays 0.
     */
    <div
      className="app-root min-h-screen bg-background"
      style={{ '--app-sb-w': `${sidebarW}px` } as React.CSSProperties}
    >
      <RealtimeStatusBanner status={realtimeStatus} />

      {/**
       * Sidebar/topbar are OUTSIDE AnimatePresence.
       * They never participate in the page transition → zero flicker.
       */}
      <Sidebar />

      {/* Mobile topbar ─ fixed, excluded from transitions */}
      <div
        className="fixed top-0 left-0 right-0 z-30 flex md:hidden flex-col bg-background/90 backdrop-blur-md border-b"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-12 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            onTouchEnd={(e) => {
              // Some mobile browsers swallow onClick when fast-tapping fixed elements.
              // Explicit touchEnd handler ensures the menu always responds.
              e.preventDefault()
              setMobileMenuOpen(true)
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-foreground active:bg-accent transition-colors -ml-1"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white text-[9px] font-bold">
              CP
            </div>
            <span className="text-[14px] font-semibold tracking-tight">ConstruçãoPro</span>
          </div>
        </div>
      </div>

      {/**
       * Single <main> – children rendered EXACTLY ONCE.
       * Previously children were rendered in two <main> elements (desktop +
       * mobile), causing React to mount the tree twice, run all hooks twice,
       * and commit two competing DOMs simultaneously — the true source of
       * the page-transition flicker.
       *
       * Responsive sizing is handled entirely by CSS in index.css:
       *   Mobile  (< md): pt = topbar + safe-area, ml = 0
       *   Desktop (≥ md): pt = 0, ml = var(--app-sb-w)
       */}
      {/**
       * APPLE PAGE TRANSITION — identical to iOS tab-switching behavior:
       *
       *   Enter:  opacity 0 → 1 over 220ms, cubic-bezier(0.25, 0.1, 0.25, 1)
       *           (Apple's system easing — Maps, Settings, App Store all use this)
       *
       *   Exit:   opacity → 0 in 0ms (instant).
       *           The old page disappears immediately; the new page fades in
       *           on top of the blank background — exactly how iOS switches
       *           tab-bar sections (no cross-dissolve, no white flash, no jitter).
       *
       *   mode="wait": unmount the exiting page before mounting the entering one.
       *   Since exit duration is 0ms the gap is imperceptible, but it halves the
       *   concurrent render budget vs mode="sync" (never two full pages at once).
       *
       *   initial={false}: suppresses animation on first render (page load).
       *
       *   willChange omitted: Framer Motion promotes/demotes the compositing
       *   layer automatically during the animation. A static willChange:'opacity'
       *   would keep a GPU layer allocated permanently for every page — memory
       *   drain on mobile.
       *
       *   overflow-x-clip removed from <main>: it was clipping position:sticky
       *   children (page headers, tab bars) in iOS Safari during transitions.
       */}
      <main className="app-main min-h-screen transition-[margin-left] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ minHeight: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
