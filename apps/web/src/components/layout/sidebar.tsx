import { useBodyScrollLock, useOverlayPresence } from '@/hooks/use-body-scroll-lock'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useRealtimeStore } from '@/stores/realtime-store'
import { useUIStore } from '@/stores/ui-store'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftRight,
  BarChart2,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { useMemo, useRef } from 'react'

const baseNav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/financeiro', label: 'Financeiro', icon: TrendingUp },
  { path: '/obras', label: 'Obras', icon: Building2 },
  { path: '/analises', label: 'Análises', icon: BarChart2 },
  { path: '/materiais', label: 'Materiais', icon: Package },
  { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { path: '/estoque', label: 'Estoque', icon: Boxes },
  { path: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
  { path: '/notas-fiscais', label: 'Notas Fiscais', icon: FileText },
  { path: '/documentacao', label: 'Documentação', icon: FolderOpen },
]

/* ── Shared sidebar content — defined at module level so React sees a stable
   component type and never unmounts/remounts it on Sidebar re-renders ── */
function SidebarInner({ isMobile }: { isMobile: boolean }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, setMobileMenuOpen } = useUIStore()
  const realtimeStatus = useRealtimeStore((s) => s.status)
  const nav = useMemo(
    () => [...baseNav, { path: '/configuracoes', label: 'Configurações', icon: Settings }],
    [],
  )

  const collapsed = sidebarCollapsed && !isMobile

  // Track touch-start Y so we can distinguish taps from scroll gestures
  const touchStartY = useRef(0)

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)

  const handleNav = (path: string) => {
    navigate({ to: path })
    setMobileMenuOpen(false)
  }

  return (
    <>
      {/* Logo */}
      <div
        className="flex h-16 items-center gap-3 px-5 border-b flex-shrink-0"
        style={
          isMobile
            ? {
                paddingTop: 'env(safe-area-inset-top, 0px)',
                height: 'calc(64px + env(safe-area-inset-top, 0px))',
              }
            : undefined
        }
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white text-[12px] font-bold flex-shrink-0">
          CP
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-[15px] font-semibold whitespace-nowrap overflow-hidden tracking-tight"
            >
              ConstruçãoPro
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-1">
        {nav.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              type="button"
              key={item.path}
              onClick={() => handleNav(item.path)}
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY
              }}
              onTouchEnd={(e) => {
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
                // Only treat as tap if finger moved less than 10px
                if (dy < 10) {
                  e.preventDefault()
                  handleNav(item.path)
                }
              }}
              className={cn(
                'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-[14px] transition-colors min-h-[44px]',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t p-3 space-y-1.5">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[12px] font-semibold flex-shrink-0">
              {user.nome?.charAt(0) ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium leading-tight">{user.nome}</p>
              <p className="text-[12px] text-muted-foreground leading-tight mt-0.5">{user.email}</p>
            </div>
          </div>
        )}
        {/* Realtime status indicator */}
        <div
          className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center px-0')}
          title={
            realtimeStatus === 'CONNECTED'
              ? 'Dados em tempo real'
              : realtimeStatus === 'RECONNECTING'
                ? 'Reconectando...'
                : 'Sem conexão'
          }
        >
          {/* Dot container — explicit h-2 w-2 so absolute pulse ring has a valid reference */}
          <div className="relative h-2 w-2 flex-shrink-0">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                realtimeStatus === 'CONNECTED'
                  ? 'bg-[#34C759]'
                  : realtimeStatus === 'RECONNECTING'
                    ? 'bg-[#FF9500]'
                    : 'bg-[#FF3B30]',
              )}
            />
            {realtimeStatus === 'CONNECTED' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-[#34C759]"
                animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
              />
            )}
            {realtimeStatus === 'RECONNECTING' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-[#FF9500]"
                animate={{ opacity: [1, 0.15, 1] }}
                transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'text-[12px] font-medium whitespace-nowrap',
                  realtimeStatus === 'CONNECTED'
                    ? 'text-[#34C759]'
                    : realtimeStatus === 'RECONNECTING'
                      ? 'text-[#FF9500]'
                      : 'text-[#FF3B30]',
                )}
              >
                {realtimeStatus === 'CONNECTED'
                  ? 'Ao vivo'
                  : realtimeStatus === 'RECONNECTING'
                    ? 'Reconectando…'
                    : 'Sem conexão'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await logout()
            } finally {
              navigate({ to: '/login' })
              setMobileMenuOpen(false)
            }
          }}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-[14px] text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore()

  // Lock background scroll when mobile drawer is open (iOS Safari needs position:fixed)
  useBodyScrollLock(mobileMenuOpen)
  useOverlayPresence(mobileMenuOpen)

  return (
    <>
      {/* ── Desktop sidebar (hidden below md) ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col border-r glass"
      >
        <SidebarInner isMobile={false} />

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-[60px] flex h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </motion.aside>

      {/* ── Mobile overlay (visible below md) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              onTouchMove={(e) => e.preventDefault()}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
            {/* Slide-in panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[280px] flex-col border-r glass md:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <SidebarInner isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
