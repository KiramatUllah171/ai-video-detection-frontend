import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getSubscriptionStatus } from '../../api/client'
import type { SubscriptionStatusResponse } from '../../api/types'
import { subscriptionStatusQueryKey } from '../../subscriptions/subscriptionErrors'
import { useLanguage } from '../../i18n/LanguageContext'
import { AppButton } from '../ui/AppButton'
import { ActivityIcon, ClockIcon, ShieldIcon } from '../ui/icons'

type SubscriptionStatusPanelProps = {
  onUpgradeClick: () => void
}

export function SubscriptionStatusPanel({ onUpgradeClick }: SubscriptionStatusPanelProps) {
  const { t } = useLanguage()
  const statusQuery = useQuery({
    queryKey: subscriptionStatusQueryKey,
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  })

  if (statusQuery.isLoading) {
    return (
      <div className="subscription-status-panel">
        <div className="subscription-status-header">
          <span className="subscription-status-icon"><ShieldIcon /></span>
          <div>
            <strong>{t('subscriptions.currentPlan')}</strong>
            <p>{t('subscriptions.checking')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!statusQuery.data) {
    return (
      <div className="subscription-status-panel">
        <div className="subscription-status-header">
          <span className="subscription-status-icon"><ShieldIcon /></span>
          <div>
            <strong>{t('subscriptions.currentPlan')}</strong>
            <p>{t('subscriptions.statusUnavailable')}</p>
          </div>
        </div>
        <AppButton type="button" variant="outline" fullWidth onClick={() => statusQuery.refetch()}>
          {t('subscriptions.refreshPlan')}
        </AppButton>
      </div>
    )
  }

  return (
    <div className="subscription-status-panel">
      <SubscriptionStatusContent status={statusQuery.data} />
      {!statusQuery.data.isAdmin && (
        <AppButton type="button" variant="outline" fullWidth onClick={onUpgradeClick}>
          {statusQuery.data.isPaid ? t('subscriptions.upgradeOrRenew') : t('subscriptions.upgradePlan')}
        </AppButton>
      )}
    </div>
  )
}

export function SubscriptionStatusContent({ status }: { status: SubscriptionStatusResponse }) {
  const { t } = useLanguage()
  const remainingScans = status.isAdmin
    ? t('subscriptions.unlimited')
    : status.remainingScans ?? status.freeTrial?.effectiveRemainingScans ?? 0
  const scanLimit = status.scanLimit ?? (status.isAdmin ? t('subscriptions.unlimited') : t('subscriptions.trial'))
  const maxVideoSize = status.maxVideoSizeBytes ? formatMegabytes(status.maxVideoSizeBytes) : t('subscriptions.unlimited')

  return (
    <>
      <div className="subscription-status-header">
        <span className="subscription-status-icon"><ShieldIcon /></span>
        <div>
          <strong>{formatPlanName(status, t)}</strong>
          <p>{status.isAdmin ? t('subscriptions.internalUnlimitedAccess') : t('subscriptions.subscriptionLabel', { plan: formatPlanCode(status.planCode, t) })}</p>
        </div>
      </div>
      <div className="subscription-status-grid">
        <StatusMetric label={t('subscriptions.usedScans')} value={String(status.usedScans)} icon={<ActivityIcon />} />
        <StatusMetric label={t('subscriptions.remaining')} value={String(remainingScans)} icon={<ActivityIcon />} />
        <StatusMetric label={t('subscriptions.scanLimit')} value={String(scanLimit)} icon={<ShieldIcon />} />
        <StatusMetric label={t('subscriptions.maxVideo')} value={maxVideoSize} icon={<ShieldIcon />} />
        <StatusMetric
          label={t('subscriptions.expiration')}
          value={status.expiresAt ? formatDate(status.expiresAt) : status.isAdmin ? t('subscriptions.noExpiry') : t('subscriptions.trialAccess')}
          icon={<ClockIcon />}
        />
      </div>
    </>
  )
}

function StatusMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="subscription-metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function formatPlanCode(planCode: string, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = planCode.trim().toLowerCase()
  if (!normalized) {
    return t('subscriptions.free')
  }

  if (normalized === 'free') {
    return t('subscriptions.free')
  }
  if (normalized === 'plus') {
    return t('subscriptions.plus')
  }
  if (normalized === 'pro') {
    return t('subscriptions.pro')
  }

  return normalized[0].toUpperCase() + normalized.slice(1)
}

function formatPlanName(status: SubscriptionStatusResponse, t: ReturnType<typeof useLanguage>['t']) {
  const normalizedCode = status.planCode.trim().toLowerCase()
  if (normalizedCode === 'free') {
    return t('subscriptions.freeTrial')
  }

  return status.planName || formatPlanCode(status.planCode, t)
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
