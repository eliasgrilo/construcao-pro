import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from '@/components/ui/toast'
import { idbPersister } from '@/lib/persister'
import { queryClient } from '@/lib/query-client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

const SW_UPDATED_EVENT = 'vite-pwa:sw-updated'

function registerAppServiceWorker() {
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  const emitUpdate = () => window.dispatchEvent(new CustomEvent(SW_UPDATED_EVENT))
  let hasHandledControllerChange = false

  // Capture the controller that existed before any change — null means first install.
  let previousController = navigator.serviceWorker.controller

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Skip the very first install — there was no previous controller,
    // so there is no "update" to announce to the user.
    if (!previousController) {
      previousController = navigator.serviceWorker.controller
      return
    }
    if (hasHandledControllerChange) return
    hasHandledControllerChange = true
    emitUpdate()
  })

  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // SPAs don't trigger real navigations, so the browser never re-fetches sw.js
          // on its own while the app is open. Poll every 60 s to detect new deploys.
          setInterval(() => registration.update(), 60_000)
        })
        .catch((error) => {
          console.error('Failed to register service worker', error)
        })
    },
    { once: true },
  )
}

registerAppServiceWorker()

const rootElement = document.getElementById('root') as HTMLElement

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: idbPersister,
          // Cache sobrevive 24h no IDB — alinhado com o gcTime do queryClient.
          // Na reabertura offline, os dados são restaurados instantaneamente.
          maxAge: 1000 * 60 * 60 * 24,
        }}
      >
        <App />
        <Toaster />
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
