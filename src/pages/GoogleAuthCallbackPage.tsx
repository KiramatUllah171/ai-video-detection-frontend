import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { consumeGoogleOAuthState, consumeGoogleReturnPath, getGoogleRedirectUri } from '../auth/googleAuth'
import { AlertCircleIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

export function GoogleAuthCallbackPage() {
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

    async function completeGoogleLogin() {
      const providerError = searchParams.get('error')
      const code = searchParams.get('code')
      const state = searchParams.get('state')

      if (providerError) {
        setError(t('login.googleCancelled'))
        return
      }

      if (!code || !consumeGoogleOAuthState(state)) {
        setError(t('login.googleFailed'))
        return
      }

      try {
        await auth.loginWithGoogle(code, getGoogleRedirectUri())
        navigate(consumeGoogleReturnPath(), { replace: true })
      } catch {
        setError(t('login.googleFailed'))
      }
    }

    void completeGoogleLogin()
  }, [auth, navigate, searchParams, t])

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('login.eyebrow')} title={t('login.googleCallbackTitle')} description={t('login.googleCallbackSubtitle')}>
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
            <span>{t('login.googleCompleting')}</span>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
