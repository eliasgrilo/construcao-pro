import { QueryClient } from '@tanstack/react-query'

function getErrorStatus(error: unknown): number | string | null {
  if (typeof error !== 'object' || error === null) return null
  if ('status' in error && (typeof error.status === 'number' || typeof error.status === 'string')) {
    return error.status
  }
  if ('code' in error && (typeof error.code === 'number' || typeof error.code === 'string')) {
    return error.code
  }
  return null
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s — keep data fresh, prevent stale/disappeared data
      gcTime: 1000 * 60 * 60 * 24, // 24h — IDB persister restores data offline between sessions
      // offlineFirst: serve data from cache even when network is unavailable.
      // Critical for PWA — without this, queries throw when SW serves assets
      // from cache but the Supabase fetch itself fails (no internet).
      networkMode: 'offlineFirst',
      // Smart retry: exponential backoff, never retry 4xx client errors
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false
        const status = getErrorStatus(error)
        if (typeof status === 'number' && status >= 400 && status < 500) return false
        return true
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true, // Refresh data when user returns to app
      refetchOnReconnect: true, // Refresh data when network reconnects
      throwOnError: false, // prevent page crash — let each component handle errors
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: false, // mutations should never auto-retry
    },
  },
})
