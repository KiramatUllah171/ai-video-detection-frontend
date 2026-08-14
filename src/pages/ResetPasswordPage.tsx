import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { checkPasswordReset, resetPassword } from '../api/client'
import { AppButton } from '../components/ui/AppButton'
import { AlertCircleIcon, CheckCircleIcon, EyeIcon, EyeOffIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

type ResetTokenState = 'checking' | 'ready' | 'blocked'

export function ResetPasswordPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(token ? null : t('resetPassword.missingToken'))
  const [statusMessage, setStatusMessage] = useState<string | null>(token ? t('resetPassword.checkingStatus') : null)
  const [tokenState, setTokenState] = useState<ResetTokenState>(token ? 'checking' : 'blocked')
  const [success, setSuccess] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkTokenStatus() {
      if (!token) {
        setTokenState('blocked')
        setStatusMessage(null)
        setError(t('resetPassword.missingToken'))
        return
      }

      setTokenState('checking')
      setStatusMessage(t('resetPassword.checkingStatus'))
      setError(null)
      try {
        const response = await checkPasswordReset(token)
        if (cancelled) {
          return
        }

        if (response.data) {
          setTokenState('ready')
          setStatusMessage(null)
          setError(null)
          return
        }

        setTokenState('blocked')
        setStatusMessage(null)
        setError(getResetErrorMessage(new Error(response.message), t))
      } catch (requestError) {
        if (!cancelled) {
          setTokenState('blocked')
          setStatusMessage(null)
          setError(getResetErrorMessage(requestError, t))
        }
      }
    }

    void checkTokenStatus()
    return () => {
      cancelled = true
    }
  }, [t, token])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || success || tokenState !== 'ready') {
      return
    }

    if (!token) {
      setError(t('resetPassword.missingToken'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, password, confirmPassword)
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getResetErrorMessage(requestError, t))
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
      <AuthCard eyebrow={t('resetPassword.eyebrow')} title={t('resetPassword.title')} description={t('resetPassword.subtitle')}>
        {statusMessage && (
          <div className="auth-alert auth-alert-neutral" role="status" aria-live="polite">
            <AlertCircleIcon />
            <span>{statusMessage}</span>
          </div>
        )}
        {error && (
          <div id="reset-password-error" className="auth-alert" role="alert" aria-live="assertive">
            <AlertCircleIcon />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert auth-alert-success" role="status" aria-live="polite">
            <CheckCircleIcon />
            <span>{t('resetPassword.success')}</span>
          </div>
        )}
        {tokenState === 'ready' && !success && (
          <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
            <div className="auth-field">
              <label className="form-label" htmlFor="reset-password">{t('resetPassword.newPassword')}</label>
              <div className="password-input-wrap">
                <input
                  ref={passwordInputRef}
                  id="reset-password"
                  className="app-input auth-input password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError(null)
                  }}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder={t('resetPassword.newPasswordPlaceholder')}
                  disabled={loading || success || tokenState !== 'ready'}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'reset-password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={loading || success || tokenState !== 'ready'}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label className="form-label" htmlFor="reset-confirm-password">{t('resetPassword.confirmPassword')}</label>
              <input
                id="reset-confirm-password"
                className="app-input auth-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (error) setError(null)
                }}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                disabled={loading || success || tokenState !== 'ready'}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'reset-password-error' : undefined}
              />
            </div>
            <AppButton type="submit" loading={loading} fullWidth disabled={success || tokenState !== 'ready'}>
              {loading ? t('resetPassword.saving') : t('resetPassword.submit')}
            </AppButton>
          </form>
        )}
        <p className="auth-switch">
          <Link to="/login">{t('forgotPassword.backToSignIn')}</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

function getResetErrorMessage(error: unknown, t: ReturnType<typeof useLanguage>['t']) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('err_network')) {
    return t('login.networkError')
  }
  if (message.includes('already been used') || message.includes('already used')) {
    return t('resetPassword.usedToken')
  }
  if (message.includes('invalid') || message.includes('expired') || message.includes('token')) {
    return t('resetPassword.invalidToken')
  }
  return t('resetPassword.error')
}
