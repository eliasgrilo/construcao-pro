import { AppLayout } from '@/components/layout/app-layout'
import { QueryErrorBoundary } from '@/components/query-error-boundary'
import { useToast } from '@/components/ui/toast'
import { auditScrollLock } from '@/hooks/use-body-scroll-lock'
import { useRealtimeSync } from '@/hooks/use-realtime'
import { useThemeCloudSync } from '@/hooks/use-theme-sync'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { validateObraDetailRouteSearch, validateObrasRouteSearch } from '@/lib/obra-route-search'
import { supabase } from '@/lib/supabase'
import { NotFoundPage } from '@/pages/not-found'
import { useAuthStore } from '@/stores/auth-store'
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Suspense, lazy, useEffect } from 'react'

// Lazy-load all pages — split initial bundle from ~556 KB to ~60 KB
const ConfiguracoesPage = lazy(() =>
  import('@/pages/configuracoes').then((m) => ({ default: m.ConfiguracoesPage })),
)
const ContaDetailPage = lazy(() =>
  import('@/pages/conta-detail').then((m) => ({ default: m.ContaDetailPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard').then((m) => ({ default: m.DashboardPage })),
)
const DocumentacaoPage = lazy(() =>
  import('@/pages/documentacao').then((m) => ({ default: m.DocumentacaoPage })),
)
const EstoquePage = lazy(() => import('@/pages/estoque').then((m) => ({ default: m.EstoquePage })))
const FinanceiroPage = lazy(() =>
  import('@/pages/financeiro').then((m) => ({ default: m.FinanceiroPage })),
)
const FornecedorDetailPage = lazy(() =>
  import('@/pages/fornecedor-detail').then((m) => ({ default: m.FornecedorDetailPage })),
)
const FornecedoresPage = lazy(() =>
  import('@/pages/fornecedores').then((m) => ({ default: m.FornecedoresPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/forgot-password').then((m) => ({ default: m.ForgotPasswordPage })),
)
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const ResetPasswordPage = lazy(() =>
  import('@/pages/reset-password').then((m) => ({ default: m.ResetPasswordPage })),
)
const MateriaisPage = lazy(() =>
  import('@/pages/materiais').then((m) => ({ default: m.MateriaisPage })),
)
const MovimentacoesPage = lazy(() =>
  import('@/pages/movimentacoes').then((m) => ({ default: m.MovimentacoesPage })),
)
const NotasFiscaisPage = lazy(() =>
  import('@/pages/notas-fiscais').then((m) => ({ default: m.NotasFiscaisPage })),
)
const ObraDetailPage = lazy(() =>
  import('@/pages/obra-detail').then((m) => ({ default: m.ObraDetailPage })),
)
const ObrasPage = lazy(() => import('@/pages/obras').then((m) => ({ default: m.ObrasPage })))
const UsuariosPage = lazy(() =>
  import('@/pages/usuarios').then((m) => ({ default: m.UsuariosPage })),
)
const AnalisesPage = lazy(() =>
  import('@/pages/analises').then((m) => ({ default: m.AnalisesPage })),
)
const SignupPage = lazy(() => import('@/pages/signup').then((m) => ({ default: m.SignupPage })))

// Skeleton shimmer that mirrors the full app layout.
// Visible during initial auth check — eliminates the white/black flash
// and sets correct visual expectations before data loads.
function AppLoader() {
  return (
    <div className="flex h-screen bg-background" aria-hidden="true">
      {/* Desktop sidebar skeleton */}
      <div className="hidden md:flex w-[260px] flex-shrink-0 flex-col border-r bg-card/40">
        <div className="flex h-16 items-center gap-3 px-5 border-b">
          <div className="h-9 w-9 rounded-xl skeleton flex-shrink-0" />
          <div className="h-4 w-28 rounded-lg skeleton" />
        </div>
        <div className="flex-1 p-3 space-y-1.5 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, no reorder
              key={i}
              className="h-11 rounded-xl skeleton"
              style={{ opacity: 1 - i * 0.07 }}
            />
          ))}
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar skeleton */}
        <div className="flex md:hidden h-12 items-center gap-3 px-4 border-b">
          <div className="h-8 w-8 rounded-xl skeleton" />
          <div className="h-4 w-32 rounded-lg skeleton" />
        </div>
        <div className="flex-1 p-4 md:p-6 space-y-4 overflow-hidden">
          {/* Page heading */}
          <div className="space-y-2 pt-2">
            <div className="h-8 w-48 rounded-xl skeleton" />
            <div className="h-4 w-72 rounded-lg skeleton opacity-70" />
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, no reorder
              <div key={i} className="h-28 rounded-2xl skeleton" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
          {/* Content rows */}
          <div className="space-y-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, no reorder
              <div key={i} className="h-20 rounded-2xl skeleton" style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Minimal inline spinner — shown only while a lazy page chunk downloads
// (after auth is already resolved and layout is painted).
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-live="polite" aria-busy="true">
      <div
        className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent"
        aria-label="Carregando página"
      />
    </div>
  )
}

// AuthGuard reads from store only — loadProfile() is managed by App via onAuthStateChange,
// so calling it here on every route mount would fire redundant network requests.
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  // Eagerly preload the dashboard chunk as soon as auth resolves.
  // Most users land on "/" — this eliminates one network waterfall hop
  // between auth-resolving and the page actually rendering.
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      import('@/pages/dashboard').catch(() => {/* non-critical */})
    }
  }, [isAuthenticated, isLoading])

  if (isLoading) return <AppLoader />
  if (!isAuthenticated) {
    sessionStorage.setItem('cpro_auth_redirect', window.location.pathname + window.location.search)
    return <Navigate to="/login" />
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppLayout>
  )
}

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
})

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => {
    const { isAuthenticated, isLoading } = useAuthStore()
    if (isLoading) return null
    if (isAuthenticated) return <Navigate to="/" />
    return (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    )
  },
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  component: () => {
    const { isAuthenticated, isLoading } = useAuthStore()
    if (isLoading) return null
    if (isAuthenticated) return <Navigate to="/" />
    return (
      <Suspense fallback={null}>
        <SignupPage />
      </Suspense>
    )
  },
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/esqueci-senha',
  component: () => (
    <Suspense fallback={null}>
      <ForgotPasswordPage />
    </Suspense>
  ),
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/redefinir-senha',
  component: () => (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  ),
})

// Protected routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <DashboardPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const obrasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/obras',
  validateSearch: validateObrasRouteSearch,
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <ObrasPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const obraDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/obras/$obraId',
  validateSearch: validateObraDetailRouteSearch,
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <ObraDetailPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const materiaisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/materiais',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <MateriaisPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const estoqueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/estoque',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <EstoquePage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const movimentacoesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/movimentacoes',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <MovimentacoesPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const notasFiscaisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notas-fiscais',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <NotasFiscaisPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const configuracoesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuracoes',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <ConfiguracoesPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const fornecedoresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fornecedores',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <FornecedoresPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const fornecedorDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fornecedores/$fornecedorId',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <FornecedorDetailPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const financeiroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <FinanceiroPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const contaDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro/$contaId',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <ContaDetailPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const documentacaoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documentacao',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <DocumentacaoPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const usuariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usuarios',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <UsuariosPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

const analisesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analises',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <AnalisesPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})

// Categorias route removed — now integrated into /materiais via segmented control

// Build route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  indexRoute,
  obrasRoute,
  obraDetailRoute,
  materiaisRoute,
  estoqueRoute,
  movimentacoesRoute,
  notasFiscaisRoute,
  analisesRoute,
  fornecedoresRoute,
  fornecedorDetailRoute,
  financeiroRoute,
  contaDetailRoute,
  documentacaoRoute,
  usuariosRoute,
  configuracoesRoute,
])

// Create router. View Transitions API is intentionally DISABLED:
// iOS Safari incorrectly snapshots backdrop-filter + position:fixed elements
// (sidebar, topbar) into both old and new layers, causing them to flash on
// every navigation. Page transitions are handled by Framer Motion AnimatePresence
// in AppLayout.tsx instead, which is correctly scoped to only the content area.
const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
  defaultViewTransition: false,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Release orphaned scroll locks on every route change.
// Prevents body scroll freeze if a modal unmounted during animation.
router.subscribe('onBeforeLoad', () => auditScrollLock())

// Update browser/PWA tab title on every navigation.
const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/obras': 'Obras',
  '/materiais': 'Materiais',
  '/estoque': 'Estoque',
  '/movimentacoes': 'Movimentações',
  '/notas-fiscais': 'Notas Fiscais',
  '/analises': 'Análises',
  '/fornecedores': 'Fornecedores',
  '/financeiro': 'Financeiro',
  '/documentacao': 'Documentação',
  '/usuarios': 'Usuários',
  '/configuracoes': 'Configurações',
  '/login': 'Entrar',
  '/cadastro': 'Criar Conta',
  '/esqueci-senha': 'Recuperar Senha',
  '/redefinir-senha': 'Redefinir Senha',
}
router.subscribe('onLoad', ({ toLocation }) => {
  const path = toLocation.pathname
  // Exact match first, then prefix match for dynamic segments (e.g. /obras/$id)
  const label =
    routeTitles[path] ?? Object.entries(routeTitles).find(([p]) => path.startsWith(`${p}/`))?.[1]
  document.title = label ? `${label} — Construção Pro` : 'Construção Pro'
})

// App subscribes to auth changes and calls loadProfile() once per event.
// AuthGuard intentionally does NOT call loadProfile() — doing so would fire
// an extra network request on every route navigation.
export function App() {
  const { loadProfile, logout, isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  // useRealtimeSync starts a persistent WebSocket channel.
  // Only run after auth confirms — avoids wasting a connection for
  // unauthenticated sessions (login page, expired tokens).
  useRealtimeSync(isAuthenticated)
  useThemeCloudSync()
  useVisualViewport()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Session expired or user signed out from another tab — clear state immediately
        loadProfile(null)
        return
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh failed — session is dead, force clean logout
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'error',
        })
        logout()
        return
      }

      // SIGNED_IN / USER_UPDATED: always refresh (permissions/profile may have changed).
      // INITIAL_SESSION / TOKEN_REFRESHED: use cached user if same ID — no extra DB round-trip.
      loadProfile(session, { forceRefresh: event === 'SIGNED_IN' || event === 'USER_UPDATED' })
    })
    return () => subscription.unsubscribe()
  }, [loadProfile, logout])

  // Re-validate session when user returns to the tab (e.g. after laptop sleep).
  // Supabase auto-refreshes tokens, but if the refresh token itself has expired
  // (default 7 days), getSession() returns null and we force-logout gracefully.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session && useAuthStore.getState().isAuthenticated) {
            logout()
          }
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [logout])

  // Notify user when a new service worker version is ready to activate.
  // main.tsx dispatches this event after controllerchange fires.
  useEffect(() => {
    const handler = () => {
      toast({
        title: 'Nova versão disponível',
        description: 'Atualize para obter as últimas melhorias.',
        duration: 0, // keep visible until dismissed
        action: {
          label: 'Atualizar',
          onClick: () => window.location.reload(),
        },
      })
    }
    window.addEventListener('vite-pwa:sw-updated', handler)
    return () => window.removeEventListener('vite-pwa:sw-updated', handler)
  }, [toast])

  return <RouterProvider router={router} />
}
