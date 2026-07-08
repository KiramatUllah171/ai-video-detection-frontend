type StatusBadgeProps = {
  status?: string | null
}

const statusMap: Record<string, string> = {
  uploaded: 'info',
  queued: 'warning',
  processing: 'processing',
  completed: 'success',
  failed: 'danger',
  deleted: 'muted',
  retrying: 'warning',
  cancelled: 'muted',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status ?? 'Queued').toLowerCase()
  const tone = statusMap[normalized] ?? 'info'

  return (
    <span className={`status-badge status-${tone}`}>
      <span className="status-dot" />
      {status ?? 'Queued'}
    </span>
  )
}
