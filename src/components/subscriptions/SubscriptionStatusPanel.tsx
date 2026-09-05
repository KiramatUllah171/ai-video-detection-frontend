import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getSubscriptionStatus } from '../../api/client'
import type { SubscriptionStatusResponse } from '../../api/types'
import { subscriptionStatusQueryKey } from '../../subscriptions/subscriptionErrors'
import { AppButton } from '../ui/AppButton'
import { ActivityIcon, ClockIcon, ShieldIcon } from '../ui/icons'

type SubscriptionStatusPanelProps = {
  onUpgradeClick: () => void
}

export function SubscriptionStatusPanel({ onUpgradeClick }: SubscriptionStatusPanelProps) {
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
            <strong>Current Plan</strong>
            <p>Checking subscription...</p>
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
            <strong>Current Plan</strong>
            <p>Plan status is temporarily unavailable.</p>
          </div>
        </div>
        <AppButton type="button" variant="outline" fullWidth onClick={() => statusQuery.refetch()}>
          Refresh Plan
        </AppButton>
      </div>
    )
  }

  return (
    <div className="subscription-status-panel">
      <SubscriptionStatusContent status={statusQuery.data} />
      {!statusQuery.data.isAdmin && (
        <AppButton type="button" variant="outline" fullWidth onClick={onUpgradeClick}>
          {statusQuery.data.isPaid ? 'Upgrade or Renew' : 'Upgrade Plan'}
        </AppButton>
      )}
    </div>
  )
}

export function SubscriptionStatusContent({ status }: { status: SubscriptionStatusResponse }) {
  const remainingScans = status.isAdmin
    ? 'Unlimited'
    : status.remainingScans ?? status.freeTrial?.effectiveRemainingScans ?? 0
  const scanLimit = status.scanLimit ?? (status.isAdmin ? 'Unlimited' : 'Trial')
  const maxVideoSize = status.maxVideoSizeBytes ? formatMegabytes(status.maxVideoSizeBytes) : 'Unlimited'

  return (
    <>
      <div className="subscription-status-header">
        <span className="subscription-status-icon"><ShieldIcon /></span>
        <div>
          <strong>{status.planName || formatPlanCode(status.planCode)}</strong>
          <p>{status.isAdmin ? 'Internal unlimited access' : `${formatPlanCode(status.planCode)} subscription`}</p>
        </div>
      </div>
      <div className="subscription-status-grid">
        <StatusMetric label="Used Scans" value={String(status.usedScans)} icon={<ActivityIcon />} />
        <StatusMetric label="Remaining" value={String(remainingScans)} icon={<ActivityIcon />} />
        <StatusMetric label="Scan Limit" value={String(scanLimit)} icon={<ShieldIcon />} />
        <StatusMetric label="Max Video" value={maxVideoSize} icon={<ShieldIcon />} />
        <StatusMetric
          label="Expiration"
          value={status.expiresAt ? formatDate(status.expiresAt) : status.isAdmin ? 'No expiry' : 'Trial access'}
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

function formatPlanCode(planCode: string) {
  const normalized = planCode.trim().toLowerCase()
  if (!normalized) {
    return 'Free'
  }

  return normalized[0].toUpperCase() + normalized.slice(1)
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
