import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { AppInput, FormField } from '../components/ui/FormField'
import { AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'

export function LoginPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await auth.login(email, password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AppCard className="auth-card">
        <span className="eyebrow">{t('login.eyebrow')}</span>
        <h1 className="auth-title">{t('login.title')}</h1>
        <p className="auth-subtitle">{t('login.subtitle')}</p>
        {error && <ErrorMessage message={error} />}
        <form className="auth-form" onSubmit={handleSubmit}>
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
          <FormField label={t('login.password')}>
            <AppInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder={t('login.passwordPlaceholder')}
            />
          </FormField>
          <AppButton type="submit" loading={loading} fullWidth>
            {t('login.signIn')}
          </AppButton>
        </form>
        <p className="auth-switch">
          {t('login.newHere')} <Link to="/signup">{t('login.createAccount')}</Link>
        </p>
      </AppCard>
    </AuthLayout>
  )
}
