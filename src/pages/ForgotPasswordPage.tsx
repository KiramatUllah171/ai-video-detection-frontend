import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/client'
import { AppButton } from '../components/ui/AppButton'
import { AppModal } from '../components/ui/AppModal'
import { AlertCircleIcon, CheckCircleIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

export function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await requestPasswordReset(email.trim())
      setSuccess(true)
      setSuccessModalOpen(true)
    } catch (requestError) {
      setError(getRecoveryErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('forgotPassword.eyebrow')} title={t('forgotPassword.title')} description={t('forgotPassword.subtitle')}>
        {error && (
          <div id="forgot-password-error" className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircleIcon />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert auth-alert-success" role="status" aria-live="polite">
            <CheckCircleIcon />
            <span>{t('forgotPassword.success')}</span>
          </div>
        )}
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
          <div className="auth-field">
            <label className="form-label" htmlFor="forgot-email">{t('login.email')}</label>
            <input
              id="forgot-email"
              className="app-input auth-input"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) setError(null)
              }}
              autoComplete="email"
              required
              placeholder={t('login.emailPlaceholder')}
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'forgot-password-error' : undefined}
            />
          </div>
          <AppButton type="submit" loading={loading} fullWidth>
            {loading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
          </AppButton>
        </form>
        <p className="auth-switch">
          <Link to="/login">{t('forgotPassword.backToSignIn')}</Link>
        </p>
      </AuthCard>
      <AppModal
        open={successModalOpen}
        title={t('forgotPassword.successTitle')}
        closeOnBackdrop={false}
        closeOnEscape={false}
        onClose={() => setSuccessModalOpen(false)}
      >
        <p className="app-modal-copy">{t('forgotPassword.success')}</p>
        <div className="app-modal-actions">
          <AppButton type="button" onClick={() => setSuccessModalOpen(false)}>
            {t('forgotPassword.gotIt')}
          </AppButton>
        </div>
      </AppModal>
    </AuthLayout>
  )
}

function getRecoveryErrorMessage(error: unknown, t: ReturnType<typeof useLanguage>['t']) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('err_network')) {
    return t('login.networkError')
  }
  return t('forgotPassword.error')
}
