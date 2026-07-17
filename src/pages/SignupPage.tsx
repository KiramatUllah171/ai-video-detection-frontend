import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { AppInput, FormField } from '../components/ui/FormField'
import { AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

export function SignupPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      await auth.signup(name, email, password, confirmPassword)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AppCard className="auth-card">
        <span className="eyebrow">{t('signup.eyebrow')}</span>
        <h1 className="auth-title">{t('signup.title')}</h1>
        <p className="auth-subtitle">{t('signup.subtitle')}</p>
        {error && <ErrorMessage message={error} />}
        <form className="auth-form" onSubmit={handleSubmit}>
          <FormField label={t('signup.name')}>
            <AppInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              placeholder={t('signup.namePlaceholder')}
            />
          </FormField>
          <FormField label={t('login.email')}>
            <AppInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder={t('login.emailPlaceholder')}
            />
          </FormField>
          <FormField label={t('login.password')} helper={t('signup.passwordHelper')}>
            <AppInput
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              placeholder={t('signup.passwordPlaceholder')}
            />
          </FormField>
          <FormField label={t('signup.confirmPassword')}>
            <AppInput
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              placeholder={t('signup.confirmPlaceholder')}
            />
          </FormField>
          <AppButton type="submit" loading={loading} fullWidth>
            {t('signup.createAccount')}
          </AppButton>
        </form>
        <p className="auth-switch">
          {t('signup.alreadyRegistered')} <Link to="/login">{t('signup.login')}</Link>
        </p>
      </AppCard>
    </AuthLayout>
  )
}
