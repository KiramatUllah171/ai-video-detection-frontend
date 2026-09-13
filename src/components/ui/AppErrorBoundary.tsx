import { Component, type ContextType, type ErrorInfo, type ReactNode } from 'react'
import { LanguageContext } from '../../i18n/LanguageContext'
import { AppCard } from './AppCard'
import { AlertCircleIcon } from './icons'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  static contextType = LanguageContext
  declare context: ContextType<typeof LanguageContext>

  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Application render failed.', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      const t = this.context!.t
      return (
        <main className="page">
          <AppCard className="app-error-boundary">
            <AlertCircleIcon />
            <div>
              <h1>{t('app.errorTitle')}</h1>
              <p>{t('app.errorDescription')}</p>
            </div>
          </AppCard>
        </main>
      )
    }

    return this.props.children
  }
}
