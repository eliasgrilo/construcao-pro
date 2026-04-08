import { QueryErrorResetBoundary } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'

interface QueryErrorBoundaryProps {
  children: ReactNode
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => <ErrorBoundary onError={() => reset()}>{children}</ErrorBoundary>}
    </QueryErrorResetBoundary>
  )
}
