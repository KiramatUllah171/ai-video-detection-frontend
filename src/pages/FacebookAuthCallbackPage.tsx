import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { consumeFacebookOAuthState, consumeFacebookReturnPath, getFacebookRedirectUri } from '../auth/facebookAuth'
import { AlertCircleIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

export function FacebookAuthCallbackPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const handledRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (handledRef.current) {
      return
    }

    handledRef.current = true

    async function completeFacebookLogin() {
      const providerError = searchParams.get('error')
      const code = searchParams.get('code')
      const state = searchParams.get('state')

      if (providerError) {
        setError(t('login.facebookCancelled'))
        return
      }

      if (!code || !consumeFacebookOAuthState(state)) {
        setError(t('login.facebookFailed'))
        return
      }

      try {
        await auth.loginWithFacebook(code, getFacebookRedirectUri())
        navigate(consumeFacebookReturnPath(), { replace: true })
      } catch {
        setError(t('login.facebookFailed'))
      }
    }

    void completeFacebookLogin()
  }, [auth, navigate, searchParams, t])

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('login.eyebrow')} title={t('login.facebookCallbackTitle')} description={t('login.facebookCallbackSubtitle')}>
        {error ? (
          <>
            <div className="auth-alert" role="alert" aria-live="assertive">
              <AlertCircleIcon />
              <span>{error}</span>
            </div>
            <p className="auth-switch">
              <Link to="/login">{t('forgotPassword.backToSignIn')}</Link>
            </p>
          </>
        ) : (
          <div className="auth-alert auth-alert-neutral" role="status" aria-live="polite">
            <span>{t('login.facebookCompleting')}</span>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
