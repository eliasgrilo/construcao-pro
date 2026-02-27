import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="text-center">
            <h2 className="text-[17px] font-semibold">Algo deu errado</h2>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
              Ocorreu um erro inesperado. Tente recarregar a página ou voltar para o início.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-muted p-3 text-left text-[11px] text-muted-foreground">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Tentar novamente
            </Button>
            <Button size="sm" onClick={() => (window.location.href = '/')}>
              Ir para início
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
