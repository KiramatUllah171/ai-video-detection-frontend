import dayjs from 'dayjs'

export function formatAdminDate(value?: string) {
  return value ? dayjs(value).format('MMM D, YYYY h:mm A') : 'Not available'
}

export function formatAdminDateShort(value?: string) {
  return value ? dayjs(value).format('MMM D, YYYY') : 'Not available'
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes)) {
    return 'Not available'
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatPercent(value?: number, scale = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Not available'
  }

  return `${(value * scale).toFixed(1)}%`
}

export function formatNullable(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return 'Not available'
  }

  return String(value)
}

export function statusTone(status?: string) {
  const normalized = (status ?? '').toLowerCase()
  if (['completed', 'success', 'active', 'confirmed'].includes(normalized)) {
    return 'success'
  }
  if (['failed', 'error', 'disabled', 'rejected'].includes(normalized)) {
    return 'danger'
  }
  if (['queued', 'processing', 'preparing', 'pending', 'retrying', 'finalizing'].includes(normalized)) {
    return 'warning'
  }
  return 'default'
}
