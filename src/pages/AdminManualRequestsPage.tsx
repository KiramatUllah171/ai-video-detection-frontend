import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { assignAdminUserRequests, getAdminUserRequestGrant, getApiErrorMessage } from '../api/client'
import type { AdminManualSubscriptionGrant } from '../api/types'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppModal } from '../components/ui/AppModal'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { PageHeader } from '../components/ui/PageHeader'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { formatAdminDate } from './adminUtils'

type GrantMode = 'add' | 'remove' | 'set'
type ToastTone = 'success' | 'danger' | 'warning'

type ToastMessage = {
  id: number
  tone: ToastTone
  title: string
  message: string
}

type GrantCalculation = {
  valid: boolean
  message: string
  currentTotal: number
  newTotal: number
  netChange: number
  currentAvailable: number
  newAvailable: number
}

export function AdminManualRequestsPage() {
  const { language, t } = useLanguage()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [loadedGrant, setLoadedGrant] = useState<AdminManualSubscriptionGrant | null>(null)
  const [grantMode, setGrantMode] = useState<GrantMode>('add')
  const [requestValue, setRequestValue] = useState('10')
  const [validityDays, setValidityDays] = useState('30')
  const [allowsDetailedScan, setAllowsDetailedScan] = useState(true)
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const normalizedEmail = email.trim()
  const canLoad = normalizedEmail.includes('@') && normalizedEmail.includes('.')
  const calculation = useMemo(
    () => calculateGrantChange(loadedGrant, grantMode, Number(requestValue), Number(validityDays)),
    [grantMode, loadedGrant, requestValue, validityDays],
  )
  const formReady = Boolean(loadedGrant)

  function pushToast(tone: ToastTone, title: string, message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [{ id, tone, title, message }, ...current].slice(0, 3))
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 5200)
  }

  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function clearLoadedUser() {
    setLoadedGrant(null)
    setConfirmOpen(false)
    loadMutation.reset()
    saveMutation.reset()
  }

  const loadMutation = useMutation({
    mutationFn: () => getAdminUserRequestGrant(normalizedEmail),
    onSuccess: (grant) => {
      setLoadedGrant(grant)
      setEmail(grant.userEmail)
      setGrantMode('add')
      setRequestValue('10')
      setValidityDays(getRemainingValidityDays(grant))
      setAllowsDetailedScan(grant.allowsDetailedScan)
      setNotes('')
      saveMutation.reset()
      pushToast('success', t('admin.manualRequests.toastLoadSuccess'), t('admin.manualRequests.toastLoadSuccessDetail', { email: grant.userEmail }))
    },
    onError: (error) => {
      setLoadedGrant(null)
      pushToast('danger', t('admin.manualRequests.toastLoadFailed'), getApiErrorMessage(error, t))
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => assignAdminUserRequests({
      email: loadedGrant?.userEmail ?? normalizedEmail,
      scanLimit: calculation.newTotal,
      validityDays: Number(validityDays),
      allowsDetailedScan,
      notes: notes.trim() || undefined,
    }),
    onSuccess: async (grant) => {
      setLoadedGrant(grant)
      setConfirmOpen(false)
      setGrantMode('add')
      setRequestValue('10')
      pushToast('success', t('admin.manualRequests.toastSaveSuccess'), t('admin.manualRequests.toastSaveSuccessDetail', {
        total: grant.scanLimit,
        email: grant.userEmail,
      }))
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
    },
    onError: (error) => {
      setConfirmOpen(false)
      pushToast('danger', t('admin.manualRequests.toastSaveFailed'), getApiErrorMessage(error, t))
    },
  })

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canLoad || loadMutation.isPending) {
      return
    }

    loadMutation.mutate()
  }

  function submitGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!calculation.valid || !loadedGrant || saveMutation.isPending) {
      if (calculation.message) {
        pushToast('warning', t('admin.manualRequests.toastReviewNeeded'), calculation.message)
      }
      return
    }

    setConfirmOpen(true)
  }

  function switchMode(mode: GrantMode) {
    setGrantMode(mode)
    if (mode === 'add') {
      setRequestValue('10')
      return
    }

    if (mode === 'remove') {
      setRequestValue('1')
      return
    }

    setRequestValue(String(Math.max(1, loadedGrant?.scanLimit ?? 10)))
  }

  return (
    <main className="page admin-page admin-manual-requests-page">
      <PageHeader
        eyebrow={t('admin.console')}
        title={t('admin.manualRequests.pageTitle')}
        subtitle={t('admin.manualRequests.pageSubtitle')}
        action={<span className="hero-pill light"><ActivityIcon />{t('admin.manualRequests.toolBadge')}</span>}
      />

      <ToastStack messages={toasts} onDismiss={dismissToast} />

      <div className="admin-grant-workspace">
        <section className="admin-grant-main">
          <AppCard className="admin-section-card admin-grant-lookup-card">
            <div className="card-header compact">
              <div>
                <h2>{t('admin.manualRequests.findUser')}</h2>
                <p>{t('admin.manualRequests.findUserSubtitle')}</p>
              </div>
              <span className={`admin-grant-state-pill ${loadedGrant ? 'success' : ''}`}>
                {loadedGrant ? t('admin.manualRequests.userLoaded') : t('admin.manualRequests.userNotLoaded')}
              </span>
            </div>

            <form className="admin-grant-lookup-form" onSubmit={submitLookup}>
              <label>
                <span>{t('admin.manualRequests.email')}</span>
                <input
                  inputMode="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearLoadedUser()
                  }}
                  placeholder="user@example.com"
                />
              </label>
              <label>
                <span>{t('admin.manualRequests.lookupScope')}</span>
                <select disabled value="email">
                  <option value="email">{t('admin.manualRequests.emailExactMatch')}</option>
                </select>
              </label>
              <button type="submit" className={buttonClassName('outline')} disabled={!canLoad || loadMutation.isPending || saveMutation.isPending}>
                {loadMutation.isPending ? t('admin.manualRequests.loading') : t('admin.manualRequests.load')}
              </button>
            </form>

            {loadMutation.error && <ErrorMessage message={getApiErrorMessage(loadMutation.error, t)} />}

            {loadedGrant && (
              <GrantStatusCard grant={loadedGrant} language={language} t={t} />
            )}
          </AppCard>

          <AppCard className={`admin-section-card admin-grant-form-card ${formReady ? '' : 'is-disabled'}`}>
            <div className="card-header compact">
              <div>
                <h2>{t('admin.manualRequests.grantRequests')}</h2>
                <p>{t('admin.manualRequests.grantRequestsSubtitle')}</p>
              </div>
              <span className={`admin-grant-state-pill ${formReady ? 'success' : ''}`}>
                {formReady ? t('admin.manualRequests.readyToEdit') : t('admin.manualRequests.loadUserFirst')}
              </span>
            </div>

            <form className="admin-grant-form" onSubmit={submitGrant}>
              <fieldset disabled={!formReady || saveMutation.isPending}>
                <div className="admin-grant-mode-grid">
                  <div>
                    <span className="admin-grant-label">{t('admin.manualRequests.grantMode')}</span>
                    <div className="admin-grant-segmented" role="group" aria-label={t('admin.manualRequests.grantMode')}>
                      <button type="button" aria-pressed={grantMode === 'add'} onClick={() => switchMode('add')}>
                        <strong>{t('admin.manualRequests.addMode')}</strong>
                        <span>{t('admin.manualRequests.addModeHint')}</span>
                      </button>
                      <button type="button" aria-pressed={grantMode === 'remove'} onClick={() => switchMode('remove')}>
                        <strong>{t('admin.manualRequests.removeMode')}</strong>
                        <span>{t('admin.manualRequests.removeModeHint')}</span>
                      </button>
                      <button type="button" aria-pressed={grantMode === 'set'} onClick={() => switchMode('set')}>
                        <strong>{t('admin.manualRequests.setMode')}</strong>
                        <span>{t('admin.manualRequests.setModeHint')}</span>
                      </button>
                    </div>
                  </div>

                  <label>
                    <span>{t(getRequestValueLabelKey(grantMode))}</span>
                    <input
                      inputMode="numeric"
                      min="1"
                      max="1000"
                      type="number"
                      value={requestValue}
                      onChange={(event) => setRequestValue(event.target.value)}
                    />
                    <small>{t(getRequestValueHelpKey(grantMode))}</small>
                  </label>

                  <label>
                    <span>{t('admin.manualRequests.validityDaysFromToday')}</span>
                    <input
                      inputMode="numeric"
                      min="1"
                      max="365"
                      type="number"
                      value={validityDays}
                      onChange={(event) => setValidityDays(event.target.value)}
                    />
                    <small>{t('admin.manualRequests.validityHelp')}</small>
                  </label>
                </div>

                <div className="admin-grant-secondary-grid">
                  <label>
                    <span>{t('admin.manualRequests.scanAccess')}</span>
                    <select value={allowsDetailedScan ? 'detailed' : 'standard'} onChange={(event) => setAllowsDetailedScan(event.target.value === 'detailed')}>
                      <option value="detailed">{t('admin.manualRequests.allowDetailed')}</option>
                      <option value="standard">{t('admin.manualRequests.standardOnly')}</option>
                    </select>
                  </label>
                  <label>
                    <span>{t('admin.manualRequests.notes')}</span>
                    <textarea
                      maxLength={500}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={t('admin.manualRequests.notesPlaceholder')}
                    />
                  </label>
                </div>
              </fieldset>

              <GrantCalculationPanel calculation={calculation} grantMode={grantMode} requestValue={requestValue} loaded={Boolean(loadedGrant)} t={t} />

              <div className="admin-grant-actions">
                <button type="button" className={buttonClassName('outline')} disabled={!formReady || saveMutation.isPending} onClick={() => {
                  setGrantMode('add')
                  setRequestValue('10')
                  setValidityDays(loadedGrant ? getRemainingValidityDays(loadedGrant) : '30')
                  setAllowsDetailedScan(loadedGrant?.allowsDetailedScan ?? true)
                  setNotes('')
                }}>
                  {t('admin.manualRequests.resetForm')}
                </button>
                <button type="submit" className={buttonClassName('primary')} disabled={!calculation.valid || !formReady || saveMutation.isPending}>
                  {saveMutation.isPending ? t('admin.manualRequests.saving') : t('admin.manualRequests.reviewAndSave')}
                </button>
              </div>
            </form>
          </AppCard>
        </section>

        <aside className="admin-grant-side">
          <AppCard className="admin-section-card admin-grant-help-card">
            <h2>{t('admin.manualRequests.flowTitle')}</h2>
            <div className="admin-grant-flow-list">
              <FlowStep number="1" title={t('admin.manualRequests.flowLoadTitle')} copy={t('admin.manualRequests.flowLoadCopy')} />
              <FlowStep number="2" title={t('admin.manualRequests.flowAddTitle')} copy={t('admin.manualRequests.flowAddCopy')} />
              <FlowStep number="3" title={t('admin.manualRequests.flowRemoveTitle')} copy={t('admin.manualRequests.flowRemoveCopy')} />
              <FlowStep number="4" title={t('admin.manualRequests.flowReviewTitle')} copy={t('admin.manualRequests.flowReviewCopy')} />
              <FlowStep number="5" title={t('admin.manualRequests.flowPopupTitle')} copy={t('admin.manualRequests.flowPopupCopy')} />
            </div>
          </AppCard>
        </aside>
      </div>

      {confirmOpen && loadedGrant && (
        <ConfirmGrantDialog
          calculation={calculation}
          email={loadedGrant.userEmail}
          grantMode={grantMode}
          requestValue={Number(requestValue)}
          saving={saveMutation.isPending}
          t={t}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => saveMutation.mutate()}
        />
      )}
    </main>
  )
}

function GrantStatusCard({
  grant,
  language,
  t,
}: {
  grant: AdminManualSubscriptionGrant
  language: ReturnType<typeof useLanguage>['language']
  t: ReturnType<typeof useLanguage>['t']
}) {
  return (
    <div className="admin-grant-status-card" role="status">
      <div className="admin-grant-status-head">
        <div>
          <strong>{t('admin.manualRequests.currentStatusFor', { email: grant.userEmail })}</strong>
          <span>{t('admin.manualRequests.currentStatusSummary', {
            remaining: grant.remainingScans,
            total: grant.scanLimit,
            expires: formatAdminDate(grant.expiresAt, t('common.notAvailable'), language),
          })}</span>
        </div>
        <span className={`admin-grant-state-pill ${grant.hasManualGrant ? 'success' : ''}`}>
          {grant.hasManualGrant ? t('admin.manualRequests.manualGrantActive') : t('admin.manualRequests.noManualGrant')}
        </span>
      </div>
      <div className="admin-grant-metrics">
        <Metric label={t('admin.manualRequests.currentTotal')} value={grant.scanLimit} />
        <Metric label={t('admin.manualRequests.used')} value={grant.usedScans} />
        <Metric label={t('admin.manualRequests.reserved')} value={grant.reservedScans} />
        <Metric label={t('admin.manualRequests.available')} value={grant.remainingScans} />
      </div>
    </div>
  )
}

function GrantCalculationPanel({
  calculation,
  grantMode,
  loaded,
  requestValue,
  t,
}: {
  calculation: GrantCalculation
  grantMode: GrantMode
  loaded: boolean
  requestValue: string
  t: ReturnType<typeof useLanguage>['t']
}) {
  return (
    <div className={`admin-grant-calculation ${calculation.valid ? '' : 'has-warning'}`}>
      <div>
        <strong>{t('admin.manualRequests.liveCalculation')}</strong>
        <p>{loaded
          ? grantMode === 'add'
            ? t('admin.manualRequests.addCalculationSummary', { amount: Number(requestValue) || 0, current: calculation.currentTotal, total: calculation.newTotal })
            : grantMode === 'remove'
              ? t('admin.manualRequests.removeCalculationSummary', { amount: Number(requestValue) || 0, current: calculation.currentTotal, total: calculation.newTotal })
              : t('admin.manualRequests.setCalculationSummary', { current: calculation.currentTotal, total: calculation.newTotal })
          : t('admin.manualRequests.loadUserToPreview')}</p>
      </div>
      {loaded && (
        <>
          <div className="admin-grant-formula">
            {grantMode === 'add'
              ? <span><b>{calculation.currentTotal}</b> {t('admin.manualRequests.currentTotalShort')} + <b>{Number(requestValue) || 0}</b> {t('admin.manualRequests.extraShort')} = <b>{calculation.newTotal}</b> {t('admin.manualRequests.newTotalShort')}</span>
              : grantMode === 'remove'
                ? <span><b>{calculation.currentTotal}</b> {t('admin.manualRequests.currentTotalShort')} - <b>{Number(requestValue) || 0}</b> {t('admin.manualRequests.removeShort')} = <b>{calculation.newTotal}</b> {t('admin.manualRequests.newTotalShort')}</span>
                : <span><b>{calculation.newTotal}</b> {t('admin.manualRequests.finalTotalShort')} - <b>{calculation.newTotal - calculation.newAvailable}</b> {t('admin.manualRequests.usedReservedShort')} = <b>{calculation.newAvailable}</b> {t('admin.manualRequests.availableAfterSave')}</span>}
          </div>
          <div className="admin-grant-review-grid">
            <Metric label={t('admin.manualRequests.currentTotal')} value={calculation.currentTotal} />
            <Metric label={t('admin.manualRequests.newTotal')} value={calculation.newTotal} />
            <Metric label={t('admin.manualRequests.netChange')} value={`${calculation.netChange >= 0 ? '+' : ''}${calculation.netChange}`} tone={calculation.netChange >= 0 ? 'success' : 'warning'} />
            <Metric label={t('admin.manualRequests.availableAfter')} value={calculation.newAvailable} />
          </div>
          {calculation.message && (
            <div className="admin-grant-validation" role="alert">
              <AlertCircleIcon />
              <span>{calculation.message}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ConfirmGrantDialog({
  calculation,
  email,
  grantMode,
  onCancel,
  onConfirm,
  requestValue,
  saving,
  t,
}: {
  calculation: GrantCalculation
  email: string
  grantMode: GrantMode
  onCancel: () => void
  onConfirm: () => void
  requestValue: number
  saving: boolean
  t: ReturnType<typeof useLanguage>['t']
}) {
  return (
    <AppModal
      open
      title={t('admin.manualRequests.confirmTitle')}
      icon={<AlertCircleIcon />}
      busy={saving}
      className="admin-grant-confirm-modal"
      onClose={onCancel}
      footer={<>
        <AppButton
          type="button"
          variant="outline"
          disabled={saving}
          onClick={onCancel}
        >
          {t('admin.manualRequests.editValues')}
        </AppButton>
        <AppButton
          type="button"
          loading={saving}
          disabled={saving}
          onClick={onConfirm}
        >
          {saving ? t('admin.manualRequests.saving') : t('admin.manualRequests.confirmSave')}
        </AppButton>
      </>}
    >
      <p className="app-modal-copy">
        {grantMode === 'add'
          ? t('admin.manualRequests.confirmAddCopy', { amount: requestValue, email })
          : grantMode === 'remove'
            ? t('admin.manualRequests.confirmRemoveCopy', { amount: requestValue, email })
            : t('admin.manualRequests.confirmSetCopy', { total: calculation.newTotal, email })}
      </p>
      <div className="admin-grant-review-grid admin-grant-modal-review">
        <Metric label={t('admin.manualRequests.currentTotal')} value={calculation.currentTotal} />
        <Metric label={t('admin.manualRequests.newTotal')} value={calculation.newTotal} />
        <Metric label={t('admin.manualRequests.netChange')} value={`${calculation.netChange >= 0 ? '+' : ''}${calculation.netChange}`} tone={calculation.netChange >= 0 ? 'success' : 'warning'} />
        <Metric label={t('admin.manualRequests.availableAfter')} value={calculation.newAvailable} />
      </div>
    </AppModal>
  )
}

function ToastStack({ messages, onDismiss }: { messages: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="admin-grant-toast-stack" aria-live="polite">
      {messages.map((message) => (
        <div className={`admin-grant-toast ${message.tone}`} key={message.id}>
          <span className="admin-grant-toast-icon">{message.tone === 'success' ? <CheckCircleIcon /> : <AlertCircleIcon />}</span>
          <div>
            <strong>{message.title}</strong>
            <span>{message.message}</span>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => onDismiss(message.id)}>
            <XIcon />
          </button>
        </div>
      ))}
    </div>
  )
}

function FlowStep({ copy, number, title }: { copy: string; number: string; title: string }) {
  return (
    <div className="admin-grant-flow-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <small>{copy}</small>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: 'success' | 'warning' }) {
  return (
    <span className={`admin-grant-metric ${tone ?? ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function calculateGrantChange(grant: AdminManualSubscriptionGrant | null, mode: GrantMode, rawValue: number, rawValidityDays: number): GrantCalculation {
  const currentTotal = grant?.scanLimit ?? 0
  const usedReserved = (grant?.usedScans ?? 0) + (grant?.reservedScans ?? 0)
  const currentAvailable = Math.max(0, currentTotal - usedReserved)

  if (!grant) {
    return {
      valid: false,
      message: '',
      currentTotal,
      newTotal: currentTotal,
      netChange: 0,
      currentAvailable,
      newAvailable: currentAvailable,
    }
  }

  if (!Number.isInteger(rawValue) || rawValue < 1 || rawValue > 1000) {
    return invalidGrantCalculation(currentTotal, currentAvailable, 'Request value must be between 1 and 1000.')
  }

  if (!Number.isInteger(rawValidityDays) || rawValidityDays < 1 || rawValidityDays > 365) {
    return invalidGrantCalculation(currentTotal, currentAvailable, 'Validity days must be between 1 and 365.')
  }

  const newTotal = mode === 'add'
    ? currentTotal + rawValue
    : mode === 'remove'
      ? currentTotal - rawValue
      : rawValue
  if (newTotal > 1000) {
    return invalidGrantCalculation(currentTotal, currentAvailable, 'Final total request limit cannot be higher than 1000.')
  }

  if (newTotal < 1) {
    return invalidGrantCalculation(currentTotal, currentAvailable, 'Final total request limit cannot be lower than 1.', newTotal)
  }

  if (newTotal < usedReserved) {
    return invalidGrantCalculation(currentTotal, currentAvailable, `Final total cannot be lower than already used or reserved requests (${usedReserved}).`, newTotal)
  }

  return {
    valid: true,
    message: '',
    currentTotal,
    newTotal,
    netChange: newTotal - currentTotal,
    currentAvailable,
    newAvailable: Math.max(0, newTotal - usedReserved),
  }
}

function getRequestValueLabelKey(mode: GrantMode) {
  if (mode === 'add') {
    return 'admin.manualRequests.extraRequests'
  }

  if (mode === 'remove') {
    return 'admin.manualRequests.requestsToRemove'
  }

  return 'admin.manualRequests.finalTotalLimit'
}

function getRequestValueHelpKey(mode: GrantMode) {
  if (mode === 'add') {
    return 'admin.manualRequests.extraRequestsHelp'
  }

  if (mode === 'remove') {
    return 'admin.manualRequests.requestsToRemoveHelp'
  }

  return 'admin.manualRequests.finalTotalHelp'
}

function invalidGrantCalculation(currentTotal: number, currentAvailable: number, message: string, newTotal = currentTotal): GrantCalculation {
  return {
    valid: false,
    message,
    currentTotal,
    newTotal,
    netChange: newTotal - currentTotal,
    currentAvailable,
    newAvailable: currentAvailable,
  }
}

function getRemainingValidityDays(grant: AdminManualSubscriptionGrant) {
  if (!grant.expiresAt) {
    return '30'
  }

  const remainingDays = Math.ceil((new Date(grant.expiresAt).getTime() - Date.now()) / 86_400_000)
  return String(Math.min(365, Math.max(1, remainingDays || 30)))
}
