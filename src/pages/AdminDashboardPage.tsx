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
import { formatAdminDateShort } from './adminUtils'

export function AdminDashboardPage() {
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
        eyebrow="Admin console"
        title="Activity dashboard"
        subtitle="Monitor users, uploads, analysis jobs, external verification usage, and recent system activity."
        action={(
          <div className="analysis-header-actions">
            <Link className={buttonClassName('outline')} to="/admin/videos">
              <VideoIcon />
              Review videos
            </Link>
            <Link className={buttonClassName('primary')} to="/admin/users">
              <UserIcon />
              Manage users
            </Link>
          </div>
        )}
      />

      {summaryQuery.isLoading && <LoadingState text="Loading admin dashboard..." />}
      {summaryQuery.error && <ErrorMessage message={getApiErrorMessage(summaryQuery.error)} />}

      {summary && (
        <>
          <section className="admin-metric-grid" aria-label="Admin metric summary">
            {summary.metrics.map((metric) => (
              <AdminMetricCard key={metric.key} metric={metric} />
            ))}
          </section>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Upload and analysis activity</h2>
                  <p>Last 14 days across the full platform.</p>
                </div>
              </div>
              <ActivityChart uploads={summary.uploadActivity} analyses={summary.analysisActivity} />
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Video status distribution</h2>
                  <p>Current state of all non-deleted videos.</p>
                </div>
              </div>
              <StatusDistribution items={summary.videoStatuses} />
            </AppCard>
          </section>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{bitmind?.providerName ?? 'External verification'} usage</h2>
                  <p>Monthly quota and request state.</p>
                </div>
              </div>
              {bitmind && (
                <div className="admin-quota-panel">
                  <div className="admin-quota-number">
                    <span>Monthly used</span>
                    <strong>{bitmind.monthlyUsed.toLocaleString()}</strong>
                    <small>{bitmind.monthlyQuotaLimit > 0 ? `${bitmind.monthlyRemaining.toLocaleString()} remaining` : 'Quota limit not configured'}</small>
                  </div>
                  <div className="admin-quota-bar" aria-label={`${quotaPercent.toFixed(1)} percent used`}>
                    <span style={{ width: `${quotaPercent}%` }} />
                  </div>
                  <div className="admin-compact-stats">
                    <span><strong>{bitmind.totalRequests.toLocaleString()}</strong>Total</span>
                    <span><strong>{bitmind.pendingRequests.toLocaleString()}</strong>Pending</span>
                    <span><strong>{bitmind.completedRequests.toLocaleString()}</strong>Completed</span>
                    <span><strong>{bitmind.failedRequests.toLocaleString()}</strong>Failed</span>
                  </div>
                  <Link className={buttonClassName('outline')} to="/admin/requests">View external requests</Link>
                </div>
              )}
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Job and request health</h2>
                  <p>Processing queue and provider request status.</p>
                </div>
              </div>
              <div className="admin-status-columns">
                <StatusList title="Jobs" items={summary.jobStatuses} />
                <StatusList title="External requests" items={summary.requestStatuses} />
              </div>
            </AppCard>
          </section>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Top uploaders</h2>
                  <p>Users with the highest upload volume.</p>
                </div>
              </div>
              <div className="admin-list-stack admin-scroll-list admin-scroll-list-rows">
                {summary.topUsers.length === 0 && <p className="muted-copy">No upload activity yet.</p>}
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
                  <h2>Recent activity</h2>
                  <p>Latest uploads and failures.</p>
                </div>
              </div>
              <div className="admin-list-stack admin-scroll-list admin-scroll-list-rows">
                {summary.recentActivity.length === 0 && <p className="muted-copy">No recent activity found.</p>}
                {summary.recentActivity.map((activity) => (
                  <div className="admin-list-row admin-activity-row" key={`${activity.type}-${activity.title}-${activity.createdAt}`}>
                    <span className={`admin-dot admin-dot-${activity.type.toLowerCase()}`} />
                    <div>
                      <strong>{activity.title}</strong>
                      <span>{activity.description}</span>
                    </div>
                    <small>{formatAdminDateShort(activity.createdAt)}</small>
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
  return (
    <AppCard className={`admin-metric admin-tone-${metric.tone}`}>
      <span className="admin-metric-icon">
        {metric.key.toLowerCase().includes('user') ? <UserIcon /> : metric.key.toLowerCase().includes('video') ? <VideoIcon /> : <ActivityIcon />}
      </span>
      <div>
        <strong>{metric.value.toLocaleString()}</strong>
        <span>{metric.label}</span>
      </div>
    </AppCard>
  )
}

function ActivityChart({ uploads, analyses }: { uploads: AdminDailyActivity[]; analyses: AdminDailyActivity[] }) {
  const rows = uploads.map((item, index) => ({
    date: item.date,
    uploads: item.count,
    analyses: analyses[index]?.count ?? 0,
  }))
  const max = Math.max(1, ...rows.flatMap((item) => [item.uploads, item.analyses]))

  return (
    <div className="admin-chart" aria-label="Upload and analysis activity chart">
      {rows.map((item) => (
        <div className="admin-chart-day" key={item.date} title={`${item.date}: ${item.uploads} uploads, ${item.analyses} analyses`}>
          <div className="admin-chart-bars">
            <span className="admin-chart-upload" style={{ height: `${Math.max(4, (item.uploads / max) * 100)}%` }} />
            <span className="admin-chart-analysis" style={{ height: `${Math.max(4, (item.analyses / max) * 100)}%` }} />
          </div>
          <small>{formatAdminDateShort(item.date).split(' ')[1]}</small>
        </div>
      ))}
      <div className="admin-chart-legend">
        <span><i className="admin-chart-upload" />Uploads</span>
        <span><i className="admin-chart-analysis" />Analyses</span>
      </div>
    </div>
  )
}

function StatusDistribution({ items }: { items: AdminStatusCount[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return <p className="muted-copy">No status data available.</p>
  }

  return (
    <div className="admin-status-distribution">
      <div className="admin-segment-bar" aria-label="Video statuses">
        {items.map((item) => (
          <span
            key={item.status}
            className={`admin-segment admin-segment-${item.status.toLowerCase()}`}
            style={{ width: `${Math.max(2, (item.count / total) * 100)}%` }}
            title={`${item.status}: ${item.count}`}
          />
        ))}
      </div>
      <StatusList title="Videos" items={items} />
    </div>
  )
}

function StatusList({ title, items }: { title: string; items: AdminStatusCount[] }) {
  return (
    <div className="admin-status-list">
      <h3>{title}</h3>
      {items.length === 0 && <p className="muted-copy">No data available.</p>}
      {items.map((item) => (
        <div className="admin-status-row" key={`${title}-${item.status}`}>
          <span><BarChartIcon />{item.status}</span>
          <strong>{item.count.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}
