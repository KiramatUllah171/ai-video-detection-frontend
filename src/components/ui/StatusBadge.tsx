import { useLanguage } from '../../i18n/LanguageContext'

type StatusBadgeProps = {
  status?: string | null
}

const statusMap: Record<string, string> = {
  uploaded: 'info',
  queued: 'queued',
  notstarted: 'muted',
  processing: 'processing',
  preparing: 'processing',
  finalizing: 'processing',
  completed: 'success',
  active: 'success',
  confirmed: 'success',
  verified: 'success',
  failed: 'danger',
  disabled: 'danger',
  error: 'danger',
  deleted: 'muted',
  expired: 'muted',
  unconfirmed: 'warning',
  retrying: 'queued',
  cancelrequested: 'warning',
  pauserequested: 'warning',
  paused: 'warning',
  resumerequested: 'queued',
  cancelled: 'muted',
  likelyreal: 'real',
  likelyaigenerated: 'ai',
  suspicious: 'suspicious',
  inconclusive: 'inconclusive',
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage()
  const normalized = (status ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '') || 'queued'
  const tone = statusMap[normalized] ?? 'info'
  const translationKey = `status.${normalized}` as Parameters<typeof t>[0]
  const translated = t(translationKey)

  return (
    <span className={`status-badge status-${tone}`}>
      <span className="status-dot" />
      {translated === translationKey ? status ?? t('status.queued') : translated}
    </span>
  )
}
