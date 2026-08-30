import type { FormEvent, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { isStrongPassword } from '../auth/passwordPolicy'
import { AppButton } from '../components/ui/AppButton'
import { AlertCircleIcon, CheckCircleIcon, ClockIcon, EyeIcon, EyeOffIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

export function SignupPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isStrongPassword(password)) {
      setError(t('signup.strongPasswordRequirement'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch'))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await auth.signup(name, email, password, confirmPassword)
      setSuccess(true)
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }

  function restorePasswordInputFocus(inputRef: RefObject<HTMLInputElement | null>) {
    const input = inputRef.current
    const selectionStart = input?.selectionStart ?? null
    const selectionEnd = input?.selectionEnd ?? null
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      if (selectionStart !== null && selectionEnd !== null) {
        inputRef.current?.setSelectionRange(selectionStart, selectionEnd)
      }
    })
  }

  function handleTogglePassword() {
    setShowPassword((current) => !current)
    restorePasswordInputFocus(passwordInputRef)
  }

  function handleToggleConfirmPassword() {
    setShowConfirmPassword((current) => !current)
    restorePasswordInputFocus(confirmPasswordInputRef)
  }

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('signup.eyebrow')} title={t('signup.title')} description={t('signup.subtitle')}>
        {success ? (
          <div className="auth-success-box" role="status" aria-live="polite">
            <CheckCircleIcon />
            <h2>{t('signup.confirmationTitle')}</h2>
            <p>{t('signup.confirmationSent')}</p>
            <Link className="auth-success-link" to="/login">{t('forgotPassword.backToSignIn')}</Link>
          </div>
        ) : (
          <>
            {error && (
              <div id="signup-error" className="auth-alert" role="alert" aria-live="assertive">
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}
            <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
              <div className="auth-field">
                <label className="form-label" htmlFor="signup-name">{t('signup.name')}</label>
                <input
                  id="signup-name"
                  className="app-input auth-input"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (error) setError(null)
                    if (success) setSuccess(false)
                  }}
                  autoComplete="name"
                  required
                  placeholder={t('signup.namePlaceholder')}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'signup-error' : undefined}
                />
              </div>
              <div className="auth-field">
                <label className="form-label" htmlFor="signup-email">{t('login.email')}</label>
                <input
                  id="signup-email"
                  className="app-input auth-input"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (error) setError(null)
                    if (success) setSuccess(false)
                  }}
                  autoComplete="email"
                  required
                  placeholder={t('login.emailPlaceholder')}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'signup-error' : undefined}
                />
              </div>
              <div className="auth-field">
                <label className="form-label" htmlFor="signup-password">{t('login.password')}</label>
                <div className="password-input-wrap">
                  <input
                    ref={passwordInputRef}
                    id="signup-password"
                    className="app-input auth-input password-input"
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (error) setError(null)
                      if (success) setSuccess(false)
                    }}
                    autoComplete="new-password"
                    required
                    placeholder={t('signup.passwordPlaceholder')}
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'signup-error signup-password-helper' : 'signup-password-helper'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={handleTogglePassword}
                    disabled={loading}
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <span id="signup-password-helper" className="form-helper">{t('signup.passwordHelper')}</span>
              </div>
              <div className="auth-field">
                <label className="form-label" htmlFor="signup-confirm-password">{t('signup.confirmPassword')}</label>
                <div className="password-input-wrap">
                  <input
                    ref={confirmPasswordInputRef}
                    id="signup-confirm-password"
                    className="app-input auth-input password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      if (error) setError(null)
                      if (success) setSuccess(false)
                    }}
                    autoComplete="new-password"
                    required
                    placeholder={t('signup.confirmPlaceholder')}
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'signup-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={handleToggleConfirmPassword}
                    disabled={loading}
                    aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div className="retention-panel retention-panel-compact">
                <span className="retention-panel-icon">
                  <ClockIcon />
                </span>
                <div>
                  <strong>{t('retention.videoWindowTitle')}</strong>
                  <p>{t('retention.publicBody')}</p>
                </div>
              </div>
              <AppButton type="submit" loading={loading} fullWidth>
                {loading ? t('signup.creatingAccount') : t('signup.createAccount')}
              </AppButton>
            </form>
            <p className="auth-switch">
              {t('signup.alreadyRegistered')} <Link to="/login">{t('signup.login')}</Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
