import { AppLayout } from '@/components/layout/app-layout'
import { QueryErrorBoundary } from '@/components/query-error-boundary'
import { supabase } from '@/lib/supabase'
import { ConfiguracoesPage } from '@/pages/configuracoes'
import { ContaDetailPage } from '@/pages/conta-detail'
import { DashboardPage } from '@/pages/dashboard'
import { EstoquePage } from '@/pages/estoque'
import { FinanceiroPage } from '@/pages/financeiro'
import { FornecedoresPage } from '@/pages/fornecedores'
import { LoginPage } from '@/pages/login'
import { MateriaisPage } from '@/pages/materiais'
import { MovimentacoesPage } from '@/pages/movimentacoes'
import { NotFoundPage } from '@/pages/not-found'
import { NotasFiscaisPage } from '@/pages/notas-fiscais'
import { ObraDetailPage } from '@/pages/obra-detail'
import { ObrasPage } from '@/pages/obras'
import { useAuthStore } from '@/stores/auth-store'
import {
  Navigate,
  NotFoundRoute,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { useEffect } from 'react'
// Categorias is now integrated inside MateriaisPage (Apple-style segmented control)

// Auth guard component with error boundary per route
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadProfile } = useAuthStore()

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" />
  return (
    <AppLayout>
      <QueryErrorBoundary>{children}</QueryErrorBoundary>
    </AppLayout>
  )
}

// Root route
const rootRoute = createRootRoute({ component: () => <Outlet /> })

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => {
    const { isAuthenticated } = useAuthStore()
    if (isAuthenticated) return <Navigate to="/" />
    return <LoginPage />
  },
})

// Protected routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  ),
})

const obrasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/obras',
  component: () => (
    <AuthGuard>
      <ObrasPage />
    </AuthGuard>
  ),
})

const obraDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/obras/$obraId',
  component: () => (
    <AuthGuard>
      <ObraDetailPage />
    </AuthGuard>
  ),
})

const materiaisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/materiais',
  component: () => (
    <AuthGuard>
      <MateriaisPage />
    </AuthGuard>
  ),
})

const estoqueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/estoque',
  component: () => (
    <AuthGuard>
      <EstoquePage />
    </AuthGuard>
  ),
})

const movimentacoesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/movimentacoes',
  component: () => (
    <AuthGuard>
      <MovimentacoesPage />
    </AuthGuard>
  ),
})

const notasFiscaisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notas-fiscais',
  component: () => (
    <AuthGuard>
      <NotasFiscaisPage />
    </AuthGuard>
  ),
})

const configuracoesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuracoes',
  component: () => (
    <AuthGuard>
      <ConfiguracoesPage />
    </AuthGuard>
  ),
})

const fornecedoresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fornecedores',
  component: () => (
    <AuthGuard>
      <FornecedoresPage />
    </AuthGuard>
  ),
})

const financeiroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro',
  component: () => (
    <AuthGuard>
      <FinanceiroPage />
    </AuthGuard>
  ),
})

const contaDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro/$contaId',
  component: () => (
    <AuthGuard>
      <ContaDetailPage />
    </AuthGuard>
  ),
})

// Categorias route removed — now integrated into /materiais via segmented control

// 404 catch-all
const notFoundRoute = new NotFoundRoute({
  getParentRoute: () => rootRoute,
  component: NotFoundPage,
})

// Build route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  obrasRoute,
  obraDetailRoute,
  materiaisRoute,
  estoqueRoute,
  movimentacoesRoute,
  notasFiscaisRoute,
  fornecedoresRoute,
  financeiroRoute,
  contaDetailRoute,
  configuracoesRoute,
])

// Create router with 404 handling
const router = createRouter({
  routeTree,
  notFoundRoute,
  defaultPreload: 'intent',
})

// App component
export function App() {
  const { loadProfile } = useAuthStore()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })
    return () => subscription.unsubscribe()
  }, [loadProfile])

  return <RouterProvider router={router} />
}
