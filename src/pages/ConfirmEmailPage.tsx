import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { checkEmailConfirmation, confirmEmail, declineEmailConfirmation } from '../api/client'
import { AppButton } from '../components/ui/AppButton'
import { AlertCircleIcon, CheckCircleIcon } from '../components/ui/icons'
import { AuthCard, AuthLayout } from '../layouts/AuthLayout'
import { useLanguage } from '../i18n/LanguageContext'
import { localizeDisplayMessage } from '../i18n/localizeDynamicText'

type ConfirmationState = 'checkingStatus' | 'ready' | 'confirming' | 'declining' | 'success' | 'declined' | 'handled' | 'error'

export function ConfirmEmailPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, setState] = useState<ConfirmationState>(token ? 'checkingStatus' : 'error')
  const [message, setMessage] = useState(token ? t('confirmEmail.checkingStatus') : t('confirmEmail.missingToken'))

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      if (!token) {
        return
      }

      setState('checkingStatus')
      setMessage(t('confirmEmail.checkingStatus'))
      try {
        const response = await checkEmailConfirmation(token)
        if (cancelled) {
          return
        }

        if (response.data) {
          setState('ready')
          setMessage(t('confirmEmail.readyMessage'))
          return
        }

        setState('handled')
        setMessage(response.message ? localizeDisplayMessage(response.message, t) : t('confirmEmail.error'))
      } catch {
        if (!cancelled) {
          setState('error')
          setMessage(t('confirmEmail.error'))
        }
      }
    }

    void checkStatus()
    return () => {
      cancelled = true
    }
  }, [t, token])

  async function handleConfirm() {
    if (!token || state === 'confirming' || state === 'declining') {
      return
    }

    setState('confirming')
    setMessage(t('confirmEmail.checking'))
    try {
      await confirmEmail(token)
      navigate('/login', { replace: true })
    } catch {
      setState('error')
      setMessage(t('confirmEmail.error'))
    }
  }

  async function handleDecline() {
    if (!token || state === 'confirming' || state === 'declining') {
      return
    }

    setState('declining')
    setMessage(t('confirmEmail.declining'))
    try {
      const response = await declineEmailConfirmation(token)
      setState('declined')
      setMessage(response.message ? localizeDisplayMessage(response.message, t) : t('confirmEmail.declined'))
    } catch {
      setState('error')
      setMessage(t('confirmEmail.declineError'))
    }
  }

  const isSuccess = state === 'success'
  const isDeclined = state === 'declined'
  const isHandled = state === 'handled'
  const isBusy = state === 'checkingStatus' || state === 'confirming' || state === 'declining'
  const showActions = token && (state === 'ready' || state === 'confirming' || state === 'declining')

  return (
    <AuthLayout>
      <AuthCard eyebrow={t('confirmEmail.eyebrow')} title={t('confirmEmail.title')} description={t('confirmEmail.subtitle')}>
        <div
          className={`auth-alert ${state === 'ready' ? 'auth-alert-warning' : ''} ${isSuccess ? 'auth-alert-success' : ''} ${isDeclined || isHandled ? 'auth-alert-neutral' : ''}`}
          role={state === 'error' ? 'alert' : 'status'}
          aria-live={isBusy ? 'polite' : 'assertive'}
        >
          {isSuccess || isDeclined || isHandled ? <CheckCircleIcon /> : <AlertCircleIcon />}
          <span>{message}</span>
        </div>
        {showActions && (
          <div className="auth-action-row">
            <AppButton type="button" onClick={handleConfirm} loading={state === 'confirming'} disabled={isBusy} fullWidth>
              {t('confirmEmail.yesItsMe')}
            </AppButton>
            <AppButton type="button" variant="outline" onClick={handleDecline} loading={state === 'declining'} disabled={isBusy} fullWidth>
              {t('confirmEmail.noItsNotMe')}
            </AppButton>
          </div>
        )}
        <p className="auth-switch">
          <Link to="/login">{t('forgotPassword.backToSignIn')}</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}
