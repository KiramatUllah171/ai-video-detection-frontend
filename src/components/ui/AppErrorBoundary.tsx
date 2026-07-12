import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AppCard } from './AppCard'
import { AlertCircleIcon } from './icons'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application render failed.', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <AppCard className="app-error-boundary">
            <AlertCircleIcon />
            <div>
              <h1>Something went wrong.</h1>
              <p>Refresh the page and try again. If this continues, check the browser console for the render error.</p>
            </div>
          </AppCard>
        </main>
      )
    }

    return this.props.children
  }
}
