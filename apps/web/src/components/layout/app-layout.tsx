import { useUIStore } from '@/stores/ui-store'
import { useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, setMobileMenuOpen } = useUIStore()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex md:hidden h-12 items-center gap-3 px-4 bg-background/80 backdrop-blur-md border-b">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground active:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white text-[9px] font-bold">
            CP
          </div>
          <span className="text-[14px] font-semibold">ConstruçãoPro</span>
        </div>
      </div>

      {/* Desktop: animated margin-left. Mobile: no margin, top padding for header */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="min-h-screen hidden md:block"
      >
        <div key={pathname} className="page-enter">{children}</div>
      </motion.main>

      {/* Mobile: no sidebar margin, add top padding for fixed header */}
      <main className="min-h-screen md:hidden pt-12 pb-[env(safe-area-inset-bottom)]">
        <div key={pathname} className="page-enter">{children}</div>
      </main>
    </div>
  )
}
