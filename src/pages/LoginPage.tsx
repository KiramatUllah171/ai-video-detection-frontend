import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { ApiResponse } from '../api/types'
import { AppButton } from '../components/ui/AppButton'
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

type LoginErrorState = {
  message: string
  field: 'email' | 'password' | 'form'
}

export function LoginPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<LoginErrorState | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(() => localStorage.getItem('ai-video-detection-last-email') ?? '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => localStorage.getItem('ai-video-detection-remember-email') === 'true')
  const [showPassword, setShowPassword] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const routeState = location.state as { from?: { pathname?: string }; reason?: string } | null
  const [routeReason] = useState(routeState?.reason)
  const guestLimitMessage = routeReason === 'GUEST_LIMIT_REACHED' ? t('guest.uploadLimitReached') : null

  useEffect(() => {
    if (!routeState?.reason) {
      return
    }

    navigate(location.pathname, {
      replace: true,
      state: routeState.from ? { from: routeState.from } : null,
    })
  }, [location.pathname, navigate, routeState])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) {
      return
    }

    const normalizedEmail = email.trim()
    setLoading(true)
    setError(null)
    try {
      await auth.login(normalizedEmail, password)
      if (rememberEmail) {
        localStorage.setItem('ai-video-detection-remember-email', 'true')
        localStorage.setItem('ai-video-detection-last-email', normalizedEmail)
      } else {
        localStorage.removeItem('ai-video-detection-remember-email')
        localStorage.removeItem('ai-video-detection-last-email')
      }
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    } catch (requestError) {
      setError(getLoginError(requestError, t))
    } finally {
      setLoading(false)
    }
  }

  function togglePasswordVisibility() {
    const input = passwordInputRef.current
    const selectionStart = input?.selectionStart ?? null
    const selectionEnd = input?.selectionEnd ?? null
    setShowPassword((current) => !current)
    window.requestAnimationFrame(() => {
      passwordInputRef.current?.focus()
      if (selectionStart !== null && selectionEnd !== null) {
        passwordInputRef.current?.setSelectionRange(selectionStart, selectionEnd)
      }
    })
  }

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('login.eyebrow')} title={t('login.title')} description={t('login.subtitle')}>
        {(error || guestLimitMessage) && (
          <div id="login-error" className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircleIcon />
            <span>{error?.message ?? guestLimitMessage}</span>
          </div>
        )}
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
          <div className="auth-field">
            <label className="form-label" htmlFor="login-email">{t('login.email')}</label>
            <input
              id="login-email"
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
              aria-invalid={error?.field === 'email' || error?.field === 'form'}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div className="auth-field">
            <label className="form-label" htmlFor="login-password">{t('login.password')}</label>
            <div className="password-input-wrap">
              <input
                ref={passwordInputRef}
                id="login-password"
                className="app-input auth-input password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError(null)
                }}
                autoComplete="current-password"
                required
                placeholder={t('login.passwordPlaceholder')}
                disabled={loading}
                aria-invalid={error?.field === 'password' || error?.field === 'form'}
                aria-describedby={error ? 'login-error' : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={loading}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="auth-options-row">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
                disabled={loading}
              />
              <span>{t('login.rememberMe')}</span>
            </label>
            <Link className="auth-muted-link" to="/forgot-password">
              {t('login.forgotPassword')}
            </Link>
          </div>
          <AppButton type="submit" loading={loading} fullWidth>
            {loading ? t('login.signingIn') : t('login.signIn')}
          </AppButton>
        </form>
        <p className="auth-switch">
          {t('login.noAccount')} <Link to="/signup">{t('login.createAccount')}</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

function getLoginError(error: unknown, t: ReturnType<typeof useLanguage>['t']): LoginErrorState {
  const message = getLoginApiMessage(error)
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('err_network')) {
    return { message: t('login.networkError'), field: 'form' }
  }

  if (message.includes('confirm your email') || message.includes('email address has not been confirmed')) {
    return { message: t('login.emailNotConfirmed'), field: 'email' }
  }

  if (message.includes('could not find an account') || message.includes('email address was not found')) {
    return { message: t('login.emailNotFound'), field: 'email' }
  }

  if (message.includes('password you entered is incorrect') || message.includes('password was incorrect')) {
    return { message: t('login.incorrectPassword'), field: 'password' }
  }

  if (
    message.includes('invalid') ||
    message.includes('unauthorized') ||
    message.includes('password') ||
    message.includes('credential')
  ) {
    return { message: t('login.invalidCredentials'), field: 'form' }
  }

  return { message: t('login.serverError'), field: 'form' }
}

function getLoginApiMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const response = error.response?.data
    return (response?.errors?.[0] ?? response?.message ?? error.message).toLowerCase()
  }

  return error instanceof Error ? error.message.toLowerCase() : ''
}
