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

export function SignupPage() {
  const auth = useAuth()
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
      setError('Passwords must match.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await auth.signup(name, email, password, confirmPassword)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AppCard className="auth-card">
        <span className="eyebrow">Start securely</span>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start analyzing videos with a secure AI-assisted workflow.</p>
        {error && <ErrorMessage message={error} />}
        <form className="auth-form" onSubmit={handleSubmit}>
          <FormField label="Name">
            <AppInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              placeholder="Your full name"
            />
          </FormField>
          <FormField label="Email">
            <AppInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="you@company.com"
            />
          </FormField>
          <FormField label="Password" helper="Use at least 8 characters.">
            <AppInput
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              placeholder="Create a password"
            />
          </FormField>
          <FormField label="Confirm password">
            <AppInput
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              placeholder="Repeat your password"
            />
          </FormField>
          <AppButton type="submit" loading={loading} fullWidth>
            Create account
          </AppButton>
        </form>
        <p className="auth-switch">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </AppCard>
    </AuthLayout>
  )
}
