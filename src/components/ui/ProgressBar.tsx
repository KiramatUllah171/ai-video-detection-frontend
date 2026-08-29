import { useLanguage } from '../../i18n/LanguageContext'

type ProgressBarProps = {
  value?: number | null
  status?: string | null
  showLabel?: boolean
}

export function ProgressBar({ value = 0, status, showLabel = true }: ProgressBarProps) {
  const { t } = useLanguage()
  const safeValue = Math.max(0, Math.min(100, value ?? 0))
  const normalized = status?.toLowerCase()
  const tone = normalized === 'failed'
    ? 'danger'
    : normalized === 'completed'
      ? 'success'
      : normalized === 'queued' || normalized === 'retrying' || normalized === 'resumerequested'
        ? 'queued'
        : normalized === 'paused' || normalized === 'pauserequested'
          ? 'paused'
          : 'info'

  return (
    <div className="progress-wrap" aria-label={t('common.progressPercent', { value: safeValue })}>
      <div className="progress-track">
        <div className={`progress-fill progress-${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
      {showLabel && <span className="progress-label">{safeValue}%</span>}
    </div>
  )
}
