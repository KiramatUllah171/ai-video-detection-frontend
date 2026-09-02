import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAdminDashboardSummary, getApiErrorMessage } from '../api/client'
import type { AdminDailyActivity, AdminMetric, AdminStatusCount } from '../api/types'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ActivityIcon, BarChartIcon, UserIcon, VideoIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { formatLocalizedDay } from '../i18n/formatDate'
import { localizeDisplayMessage } from '../i18n/localizeDynamicText'
import { formatAdminDateShort } from './adminUtils'

export function AdminDashboardPage() {
  const { language, t } = useLanguage()
  const summaryQuery = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: getAdminDashboardSummary,
    refetchInterval: 30000,
  })

  const summary = summaryQuery.data
  const bitmind = summary?.externalRequests
  const quotaPercent = bitmind && bitmind.monthlyQuotaLimit > 0
    ? Math.min(100, (bitmind.monthlyUsed / bitmind.monthlyQuotaLimit) * 100)
    : 0

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow={t('admin.console')}
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.subtitle')}
        action={(
          <div className="analysis-header-actions">
            <Link className={buttonClassName('outline')} to="/admin/videos">
              <VideoIcon />
              {t('admin.dashboard.reviewVideos')}
            </Link>
            <Link className={buttonClassName('primary')} to="/admin/users">
              <UserIcon />
              {t('admin.dashboard.manageUsers')}
            </Link>
          </div>
        )}
      />

      {summaryQuery.isLoading && <LoadingState text={t('admin.loadingDashboard')} />}
      {summaryQuery.error && <ErrorMessage message={getApiErrorMessage(summaryQuery.error, t)} />}

      {summary && (
        <>
          <section className="admin-metric-grid" aria-label={t('admin.metricSummary')}>
            {summary.metrics.map((metric) => (
              <AdminMetricCard key={metric.key} metric={metric} />
            ))}
          </section>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.activity.title')}</h2>
                  <p>{t('admin.activity.subtitle')}</p>
                </div>
              </div>
              <ActivityChart uploads={summary.uploadActivity} analyses={summary.analysisActivity} />
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.statusDistribution.title')}</h2>
                  <p>{t('admin.statusDistribution.subtitle')}</p>
                </div>
              </div>
              <StatusDistribution items={summary.videoStatuses} />
            </AppCard>
          </section>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.bitmind.usage', { provider: bitmind?.providerName ?? t('admin.bitmind.externalVerification') })}</h2>
                  <p>{t('admin.bitmind.subtitle')}</p>
                </div>
              </div>
              {bitmind && (
                <div className="admin-quota-panel">
                  <div className="admin-quota-number">
                    <span>{t('admin.bitmind.monthlyUsed')}</span>
                    <strong>{bitmind.monthlyUsed.toLocaleString()}</strong>
                    <small>{bitmind.monthlyQuotaLimit > 0 ? t('admin.bitmind.remaining', { count: bitmind.monthlyRemaining.toLocaleString() }) : t('admin.bitmind.quotaNotConfigured')}</small>
                  </div>
                  <div className={`admin-provider-health ${bitmind.circuitOpen ? 'is-paused' : 'is-available'}`}>
                    <span>{bitmind.circuitOpen ? t('admin.bitmind.healthPaused') : t('admin.bitmind.healthAvailable')}</span>
                    <small>
                      {bitmind.circuitOpen
                        ? t('admin.bitmind.circuitFailures', { count: bitmind.circuitConsecutiveFailures.toLocaleString() })
                        : t('admin.bitmind.providerReady')}
                    </small>
                  </div>
                  <div className="admin-quota-bar" aria-label={t('admin.bitmind.percentUsed', { percent: quotaPercent.toFixed(1) })}>
                    <span style={{ width: `${quotaPercent}%` }} />
                  </div>
                  <div className="admin-compact-stats">
                    <span><strong>{bitmind.totalRequests.toLocaleString()}</strong>{t('common.total')}</span>
                    <span><strong>{bitmind.pendingRequests.toLocaleString()}</strong>{t('common.pending')}</span>
                    <span><strong>{bitmind.completedRequests.toLocaleString()}</strong>{t('common.completed')}</span>
                    <span><strong>{bitmind.failedRequests.toLocaleString()}</strong>{t('common.failed')}</span>
                  </div>
                  <Link className={buttonClassName('outline')} to="/admin/requests">{t('admin.bitmind.viewRequests')}</Link>
                </div>
              )}
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.health.title')}</h2>
                  <p>{t('admin.health.subtitle')}</p>
                </div>
              </div>
              <div className="admin-status-columns">
                <StatusList title={t('admin.health.jobs')} items={summary.jobStatuses} />
                <StatusList title={t('admin.health.externalRequests')} items={summary.requestStatuses} />
              </div>
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.cleanup.title')}</h2>
                  <p>{t('admin.cleanup.subtitle')}</p>
                </div>
              </div>
              <div className="admin-cleanup-panel">
                <div className={`admin-provider-health ${summary.retentionCleanup.failuresLast24Hours > 0 ? 'is-paused' : 'is-available'}`}>
                  <span>{localizeStatusLabel(summary.retentionCleanup.lastStatus, t)}</span>
                  <small>
                    {summary.retentionCleanup.lastRunAt
                      ? formatAdminDateShort(summary.retentionCleanup.lastRunAt, t('common.notAvailable'), language)
                      : t('admin.cleanup.notRun')}
                  </small>
                </div>
                <div className="admin-compact-stats">
                  <span><strong>{summary.retentionCleanup.runsLast24Hours.toLocaleString()}</strong>{t('admin.cleanup.runs24h')}</span>
                  <span><strong>{summary.retentionCleanup.failuresLast24Hours.toLocaleString()}</strong>{t('admin.cleanup.failures24h')}</span>
                  <span><strong>{summary.retentionCleanup.pendingOriginalVideoCleanup.toLocaleString()}</strong>{t('admin.cleanup.pendingVideos')}</span>
                  <span><strong>{summary.retentionCleanup.pendingDetailedPayloadCleanup.toLocaleString()}</strong>{t('admin.cleanup.pendingDetails')}</span>
                </div>
                <p className="muted-copy">{t('admin.cleanup.pendingFrames', { count: summary.retentionCleanup.pendingTemporaryFrameCleanup.toLocaleString() })}</p>
              </div>
            </AppCard>
          </section>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.topUploaders.title')}</h2>
                  <p>{t('admin.topUploaders.subtitle')}</p>
                </div>
              </div>
              <div className="admin-list-stack admin-scroll-list admin-scroll-list-rows">
                {summary.topUsers.length === 0 && <p className="muted-copy">{t('admin.topUploaders.empty')}</p>}
                {summary.topUsers.map((user) => (
                  <div className="admin-list-row" key={user.email}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <b>{user.uploadCount.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.recent.title')}</h2>
                  <p>{t('admin.recent.subtitle')}</p>
                </div>
              </div>
              <div className="admin-list-stack admin-scroll-list admin-scroll-list-rows">
                {summary.recentActivity.length === 0 && <p className="muted-copy">{t('admin.recent.empty')}</p>}
                {summary.recentActivity.map((activity) => (
                  <div className="admin-list-row admin-activity-row" key={`${activity.type}-${activity.title}-${activity.createdAt}`}>
                    <span className={`admin-dot admin-dot-${activity.type.toLowerCase()}`} />
                    <div>
                      <strong>{activity.title}</strong>
                      <span>{localizeDisplayMessage(activity.description, t)}</span>
                    </div>
                    <small>{formatAdminDateShort(activity.createdAt, t('common.notAvailable'), language)}</small>
                  </div>
                ))}
              </div>
            </AppCard>
          </section>
        </>
      )}
    </main>
  )
}

function AdminMetricCard({ metric }: { metric: AdminMetric }) {
  const { t } = useLanguage()

  return (
    <AppCard className={`admin-metric admin-tone-${metric.tone}`}>
      <span className="admin-metric-icon">
        {metric.key.toLowerCase().includes('user') ? <UserIcon /> : metric.key.toLowerCase().includes('video') ? <VideoIcon /> : <ActivityIcon />}
      </span>
      <div>
        <strong>{metric.value.toLocaleString()}</strong>
        <span>{localizeMetricLabel(metric, t)}</span>
      </div>
    </AppCard>
  )
}

function ActivityChart({ uploads, analyses }: { uploads: AdminDailyActivity[]; analyses: AdminDailyActivity[] }) {
  const { language, t } = useLanguage()
  const rows = uploads.map((item, index) => ({
    date: item.date,
    uploads: item.count,
    analyses: analyses[index]?.count ?? 0,
  }))
  const max = Math.max(1, ...rows.flatMap((item) => [item.uploads, item.analyses]))

  return (
    <div className="admin-chart" aria-label={t('admin.activity.chartLabel')}>
      {rows.map((item) => (
        <div className="admin-chart-day" key={item.date} title={`${item.date}: ${item.uploads} ${t('admin.activity.uploads').toLowerCase()}, ${item.analyses} ${t('admin.activity.analyses').toLowerCase()}`}>
          <div className="admin-chart-bars">
            <span className="admin-chart-upload" style={{ height: `${Math.max(4, (item.uploads / max) * 100)}%` }} />
            <span className="admin-chart-analysis" style={{ height: `${Math.max(4, (item.analyses / max) * 100)}%` }} />
          </div>
          <small>{formatLocalizedDay(item.date, language, t('common.notAvailable'))}</small>
        </div>
      ))}
      <div className="admin-chart-legend">
        <span><i className="admin-chart-upload" />{t('admin.activity.uploads')}</span>
        <span><i className="admin-chart-analysis" />{t('admin.activity.analyses')}</span>
      </div>
    </div>
  )
}

function StatusDistribution({ items }: { items: AdminStatusCount[] }) {
  const { t } = useLanguage()
  const total = items.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return <p className="muted-copy">{t('admin.statusDistribution.noData')}</p>
  }

  return (
    <div className="admin-status-distribution">
      <div className="admin-segment-bar" aria-label={t('admin.statusDistribution.videoStatuses')}>
        {items.map((item) => (
          <span
            key={item.status}
            className={`admin-segment admin-segment-${item.status.toLowerCase()}`}
            style={{ width: `${Math.max(2, (item.count / total) * 100)}%` }}
            title={`${localizeStatusLabel(item.status, t)}: ${item.count}`}
          />
        ))}
      </div>
      <StatusList title={t('admin.health.videos')} items={items} />
    </div>
  )
}

function StatusList({ title, items }: { title: string; items: AdminStatusCount[] }) {
  const { t } = useLanguage()

  return (
    <div className="admin-status-list">
      <h3>{title}</h3>
      {items.length === 0 && <p className="muted-copy">{t('admin.noData')}</p>}
      {items.map((item) => (
        <div className="admin-status-row" key={`${title}-${item.status}`}>
          <span><BarChartIcon />{localizeStatusLabel(item.status, t)}</span>
          <strong>{item.count.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

function localizeMetricLabel(metric: AdminMetric, t: ReturnType<typeof useLanguage>['t']) {
  const key = `admin.metric.${metric.key}`
  const label = t(key)
  return label === key ? metric.label : label
}

function localizeStatusLabel(status: string, t: ReturnType<typeof useLanguage>['t']) {
  const key = `status.${status.toLowerCase().replace(/\s+/g, '')}`
  const label = t(key)
  return label === key ? status : label
}
