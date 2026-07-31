import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmEmail } from '../api/client'
import { AlertCircleIcon, CheckCircleIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

type ConfirmationState = 'checking' | 'success' | 'error'

export function ConfirmEmailPage() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, setState] = useState<ConfirmationState>(token ? 'checking' : 'error')
  const [message, setMessage] = useState(token ? t('confirmEmail.checking') : t('confirmEmail.missingToken'))

  useEffect(() => {
    let cancelled = false

    async function confirm() {
      if (!token) {
        return
      }

      try {
        await confirmEmail(token)
        if (!cancelled) {
          setState('success')
          setMessage(t('confirmEmail.success'))
        }
      } catch {
        if (!cancelled) {
          setState('error')
          setMessage(t('confirmEmail.error'))
        }
      }
    }

    void confirm()
    return () => {
      cancelled = true
    }
  }, [t, token])

  const isSuccess = state === 'success'

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('confirmEmail.eyebrow')} title={t('confirmEmail.title')} description={t('confirmEmail.subtitle')}>
        <div
          className={`auth-alert ${isSuccess ? 'auth-alert-success' : ''}`}
          role={state === 'error' ? 'alert' : 'status'}
          aria-live={state === 'checking' ? 'polite' : 'assertive'}
        >
          {isSuccess ? <CheckCircleIcon /> : <AlertCircleIcon />}
          <span>{message}</span>
        </div>
        <p className="auth-switch">
          <Link to="/login">{t('forgotPassword.backToSignIn')}</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}
