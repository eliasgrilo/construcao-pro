import { useEffect } from 'react'
import {
    createRouter,
    createRoute,
    createRootRoute,
    Outlet,
    Navigate,
    RouterProvider,
    NotFoundRoute,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { QueryErrorBoundary } from '@/components/query-error-boundary'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { ObrasPage } from '@/pages/obras'
import { ObraDetailPage } from '@/pages/obra-detail'
import { MateriaisPage } from '@/pages/materiais'
import { EstoquePage } from '@/pages/estoque'
import { MovimentacoesPage } from '@/pages/movimentacoes'
import { NotasFiscaisPage } from '@/pages/notas-fiscais'
import { ConfiguracoesPage } from '@/pages/configuracoes'
import { NotFoundPage } from '@/pages/not-found'
import { FornecedoresPage } from '@/pages/fornecedores'
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
            <QueryErrorBoundary>
                {children}
            </QueryErrorBoundary>
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
    component: () => <AuthGuard><DashboardPage /></AuthGuard>,
})

const obrasRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/obras',
    component: () => <AuthGuard><ObrasPage /></AuthGuard>,
})

const obraDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/obras/$obraId',
    component: () => <AuthGuard><ObraDetailPage /></AuthGuard>,
})

const materiaisRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/materiais',
    component: () => <AuthGuard><MateriaisPage /></AuthGuard>,
})

const estoqueRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/estoque',
    component: () => <AuthGuard><EstoquePage /></AuthGuard>,
})

const movimentacoesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/movimentacoes',
    component: () => <AuthGuard><MovimentacoesPage /></AuthGuard>,
})

const notasFiscaisRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/notas-fiscais',
    component: () => <AuthGuard><NotasFiscaisPage /></AuthGuard>,
})

const configuracoesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/configuracoes',
    component: () => <AuthGuard><ConfiguracoesPage /></AuthGuard>,
})

const fornecedoresRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/fornecedores',
    component: () => <AuthGuard><FornecedoresPage /></AuthGuard>,
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadProfile()
        })
        return () => subscription.unsubscribe()
    }, [loadProfile])

    return <RouterProvider router={router} />
}
