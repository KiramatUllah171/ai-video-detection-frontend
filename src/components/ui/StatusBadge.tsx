import { useLanguage } from '../../i18n/LanguageContext'

type StatusBadgeProps = {
  status?: string | null
}

const statusMap: Record<string, string> = {
  uploaded: 'info',
  queued: 'queued',
  processing: 'processing',
  completed: 'success',
  failed: 'danger',
  deleted: 'muted',
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
  const normalized = (status ?? 'Queued').toLowerCase()
  const tone = statusMap[normalized] ?? 'info'
  const translationKey = `status.${normalized.replace(/\s+/g, '')}` as Parameters<typeof t>[0]

  return (
    <span className={`status-badge status-${tone}`}>
      <span className="status-dot" />
      {t(translationKey) === translationKey ? status ?? t('status.queued') : t(translationKey)}
    </span>
  )
}
