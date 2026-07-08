import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/client'
import type { ApiResponse, PagedResponse, VideoHistoryItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, UploadIcon, VideoIcon } from '../components/ui/icons'

export function DashboardPage() {
  const auth = useAuth()
  const historyQuery = useQuery({
    queryKey: ['video-history'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PagedResponse<VideoHistoryItem>>>('/api/videos/history')
      return response.data.data
    },
  })

  const items = historyQuery.data?.items ?? []
  const firstName = auth.user?.name?.split(' ')[0] ?? auth.user?.email ?? 'there'
  const totalUploads = items.length
  const queuedJobs = items.filter((item) => (item.latestJobStatus ?? item.status).toLowerCase() === 'queued').length
  const processingJobs = items.filter((item) => (item.latestJobStatus ?? item.status).toLowerCase() === 'processing').length
  const completedAnalyses = items.filter((item) => item.status.toLowerCase() === 'completed').length
  const failedJobs = items.filter((item) => item.status.toLowerCase() === 'failed' || item.latestJobStatus?.toLowerCase() === 'failed').length

  return (
    <main className="page">
      <PageHeader
        eyebrow="Secure analysis workspace"
        title={`Good to see you, ${firstName}`}
        subtitle="Monitor uploaded videos, queued analysis jobs, and authenticity report readiness."
        action={
          <Link className={buttonClassName('primary')} to="/upload">
            <UploadIcon />
            Upload New Video
          </Link>
        }
      />

      <section className="dashboard-hero">
        <div>
          <span className="hero-pill light">
            <ActivityIcon />
            Authenticity pipeline
          </span>
          <h2>Bring every video into a traceable verification workflow.</h2>
          <p>
            Upload media, monitor queued analysis, and keep every investigation step visible from one
            professional control center.
          </p>
        </div>
        <Link className={buttonClassName('secondary')} to="/upload">
          Start Analysis
        </Link>
      </section>

      <section className="summary-grid" aria-label="Video analysis summary">
        <SummaryCard icon={<VideoIcon />} label="Total uploads" value={totalUploads} />
        <SummaryCard icon={<ClockIcon />} label="Queued jobs" value={queuedJobs} />
        <SummaryCard icon={<ActivityIcon />} label="Processing" value={processingJobs} />
        <SummaryCard icon={<CheckCircleIcon />} label="Completed" value={completedAnalyses} />
        <SummaryCard icon={<AlertCircleIcon />} label="Failed" value={failedJobs} tone="danger" />
      </section>

      <AppCard>
        <div className="card-header">
          <div>
            <h2>Recent uploads</h2>
            <p>Latest videos submitted to the secure analysis queue.</p>
          </div>
        </div>
        {historyQuery.isLoading && <LoadingState text="Loading your secure video history..." />}
        {historyQuery.error && <ErrorMessage message="We couldn't load your video history. Please refresh and try again." />}
        {!historyQuery.isLoading && !historyQuery.error && items.length === 0 && (
          <EmptyState
            icon={<UploadIcon />}
            title="No videos uploaded yet"
            description="Upload your first video to start an AI-assisted authenticity analysis."
            action={
              <Link className={buttonClassName('primary')} to="/upload">
                Upload Video
              </Link>
            }
          />
        )}
        {items.length > 0 && (
          <div className="table-shell">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Video name</th>
                  <th>Status</th>
                  <th>Job status</th>
                  <th>Progress</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.videoId}>
                    <td>
                      <div className="video-cell">
                        <span className="file-icon">
                          <VideoIcon />
                        </span>
                        <div>
                          <strong>{item.originalName}</strong>
                          <span>{formatFileSize(item.fileSize)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <StatusBadge status={item.latestJobStatus ?? 'Queued'} />
                    </td>
                    <td>
                      <ProgressBar value={item.latestJobProgress ?? 0} status={item.latestJobStatus} />
                    </td>
                    <td>{dayjs(item.createdAt).format('MMM D, YYYY h:mm A')}</td>
                    <td>
                      <Link className={buttonClassName('outline')} to={`/processing/${item.videoId}`}>
                        View Status
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>
    </main>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode
  label: string
  value: number
  tone?: 'default' | 'danger'
}) {
  return (
    <AppCard className={`summary-card ${tone === 'danger' ? 'summary-danger' : ''}`} hover>
      <div className="summary-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </AppCard>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
