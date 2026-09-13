import type { LanguageCode } from '../i18n/LanguageContext'
import { formatLocalizedDateShort, formatLocalizedDateTime } from '../i18n/formatDate'

export function formatAdminDate(value?: string, fallback = 'Not available', language: LanguageCode = 'en') {
  return formatLocalizedDateTime(value, language, fallback)
}

export function formatAdminDateShort(value?: string, fallback = 'Not available', language: LanguageCode = 'en') {
  return formatLocalizedDateShort(value, language, fallback)
}

export function formatFileSize(bytes: number, fallback = 'Not available') {
  if (!Number.isFinite(bytes)) {
    return fallback
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatPercent(value?: number, scale = 1, fallback = 'Not available') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return `${(value * scale).toFixed(1)}%`
}

export function formatNullable(value?: string | number | null, fallback = 'Not available') {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return String(value)
}

export function statusTone(status?: string) {
  const normalized = (status ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
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
