type ProgressBarProps = {
  value?: number | null
  status?: string | null
  showLabel?: boolean
}

export function ProgressBar({ value = 0, status, showLabel = true }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value ?? 0))
  const tone = status?.toLowerCase() === 'failed' ? 'danger' : status?.toLowerCase() === 'completed' ? 'success' : 'info'

  return (
    <div className="progress-wrap" aria-label={`Progress ${safeValue}%`}>
      <div className="progress-track">
        <div className={`progress-fill progress-${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
      {showLabel && <span className="progress-label">{safeValue}%</span>}
    </div>
  )
}
