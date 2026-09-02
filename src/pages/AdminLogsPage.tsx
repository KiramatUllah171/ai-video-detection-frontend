import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getAdminAuditLogs, getApiErrorMessage } from '../api/client'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ActivityIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { formatAdminDate, formatNullable } from './adminUtils'

const pageSize = 10

export function AdminLogsPage() {
  const { language, t } = useLanguage()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [severity, setSeverity] = useState('')
  const [category, setCategory] = useState('')

  const logsQuery = useQuery({
    queryKey: ['admin-audit-logs', page, search, fromDate, toDate, severity, category],
    queryFn: () => getAdminAuditLogs({
      page,
      pageSize,
      search: search.trim() || undefined,
      from: toStartOfDayIso(fromDate),
      to: toEndOfDayIso(toDate),
      severity: severity || undefined,
      category: category || undefined,
    }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 15000,
  })

  const logs = logsQuery.data?.items ?? []

  function clearFilters() {
    setSearch('')
    setFromDate('')
    setToDate('')
    setSeverity('')
    setCategory('')
    setPage(1)
  }

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow={t('admin.console')}
        title={t('admin.logs.title')}
        subtitle={t('admin.logs.subtitle')}
        action={<span className="hero-pill light"><ActivityIcon />{t('admin.logs.count', { count: logsQuery.data?.totalCount.toLocaleString() ?? 0 })}</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>{t('admin.logs.activity')}</h2>
            <p>{t('admin.logs.activitySubtitle')}</p>
          </div>
          <button type="button" className={buttonClassName('outline')} onClick={clearFilters}>
            {t('admin.logs.clearFilters')}
          </button>
        </div>

        <div className="admin-filter-grid admin-log-filter-grid">
          <label>
            <span>{t('admin.logs.userSearch')}</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t('admin.logs.userSearchPlaceholder')}
            />
          </label>
          <label>
            <span>{t('admin.logs.fromDate')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            <span>{t('admin.logs.toDate')}</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            <span>{t('admin.logs.severity')}</span>
            <select
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('admin.logs.allSeverity')}</option>
              <option value="Information">{t('admin.logs.information')}</option>
              <option value="Warning">{t('admin.logs.warning')}</option>
              <option value="Error">{t('admin.logs.error')}</option>
            </select>
          </label>
          <label>
            <span>{t('admin.logs.category')}</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('admin.logs.allCategories')}</option>
              <option value="Authentication">{t('admin.logs.categoryAuthentication')}</option>
              <option value="Video">{t('admin.logs.categoryVideo')}</option>
              <option value="Report">{t('admin.logs.categoryReport')}</option>
              <option value="Processing">{t('admin.logs.categoryProcessing')}</option>
              <option value="Admin">{t('admin.logs.categoryAdmin')}</option>
              <option value="Api">{t('admin.logs.categoryApi')}</option>
            </select>
          </label>
        </div>

        {logsQuery.isLoading && <LoadingState text={t('admin.logs.loading')} />}
        {logsQuery.error && <ErrorMessage message={getApiErrorMessage(logsQuery.error, t)} />}

        {logs.length > 0 && (
          <div className="table-shell">
            <table className="premium-table admin-table admin-table-relaxed admin-logs-table">
              <colgroup>
                <col className="admin-logs-user-col" />
                <col className="admin-logs-event-col" />
                <col className="admin-logs-resource-col" />
              </colgroup>
              <thead>
                <tr>
                  <th>{t('admin.logs.user')}</th>
                  <th>{t('admin.logs.event')}</th>
                  <th>{t('admin.logs.resource')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="admin-mini-counts">
                        <strong>{formatNullable(log.userName, t('admin.logs.guestUser'))}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="admin-log-event">
                        <strong>{localizeAuditAction(log.action, t)}</strong>
                        <span>{localizeAuditMessage(log.action, log.message, t)}</span>
                        {log.correlationId && <small>{t('admin.logs.reference', { correlationId: log.correlationId })}</small>}
                        <small>{formatAdminDate(log.createdAt, t('common.notAvailable'), language)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="admin-mini-counts">
                        <strong>{localizeAuditCategory(log.category, t)}</strong>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!logsQuery.isLoading && logs.length === 0 && <p className="muted-copy">{t('admin.logs.empty')}</p>}
        <div className="admin-pagination">
          <button type="button" className={buttonClassName('outline')} disabled={(logsQuery.data?.page ?? page) <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <span>{t('common.pageOf', { page: logsQuery.data?.page ?? page, totalPages: Math.max(1, logsQuery.data?.totalPages ?? 1) })}</span>
          <button type="button" className={buttonClassName('outline')} disabled={(logsQuery.data?.page ?? page) >= (logsQuery.data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      </AppCard>
    </main>
  )
}

function toStartOfDayIso(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined
}

function toEndOfDayIso(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined
}

function localizeAuditCategory(category: string, t: ReturnType<typeof useLanguage>['t']) {
  const key = `admin.logs.category${category}` as const
  const localized = t(key)
  return localized === key ? category : localized
}

function localizeAuditAction(action: string, t: ReturnType<typeof useLanguage>['t']) {
  const key = `admin.logs.action${action}` as const
  const localized = t(key)
  return localized === key ? action : localized
}

function localizeAuditMessage(action: string, message: string, t: ReturnType<typeof useLanguage>['t']) {
  const actionMessageKey = `admin.logs.message${action}` as const
  const actionMessage = t(actionMessageKey)
  if (actionMessage !== actionMessageKey) {
    return actionMessage
  }

  const normalized = message.toLowerCase()
  if (normalized.includes('failed with http')) {
    return t('admin.logs.messageHttpFailed', { status: message.match(/\d{3}/)?.[0] ?? '' })
  }
  if (normalized.includes('completed')) {
    return t('admin.logs.messageCompleted')
  }
  return message
}
