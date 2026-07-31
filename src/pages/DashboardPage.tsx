import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, type ReactNode } from 'react'
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
import { useLanguage } from '../i18n/LanguageContext'

export function DashboardPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const historyQuery = useQuery<PagedResponse<VideoHistoryItem>, Error>({
    queryKey: ['video-history'],
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      if (!hasLiveDashboardJobs(items)) {
        return false
      }

      return typeof document !== 'undefined' && document.hidden ? 10000 : 3000
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    placeholderData: (previousData) => previousData,
    structuralSharing: (oldData, newData) => mergeHistoryData(
      oldData as PagedResponse<VideoHistoryItem> | undefined,
      newData as PagedResponse<VideoHistoryItem>,
    ),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<ApiResponse<PagedResponse<VideoHistoryItem>>>('/api/videos/history', {
        signal,
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.errors?.[0] ?? response.data.message)
      }

      return normalizeHistoryResponse(response.data.data)
    },
  })

  const items = historyQuery.data?.items ?? []
  const { refetch } = historyQuery
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        void refetch({ cancelRefetch: true })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refetch])

  const firstName = auth.user?.name?.split(' ')[0] ?? auth.user?.email ?? 'there'
  const totalUploads = items.length
  const queuedJobs = items.filter((item) => isQueuedStatus(getEffectiveStatus(item))).length
  const processingJobs = items.filter((item) => isProcessingStatus(getEffectiveStatus(item))).length
  const completedAnalyses = items.filter((item) => getEffectiveStatus(item) === 'completed').length
  const failedJobs = items.filter((item) => getEffectiveStatus(item) === 'failed').length

  return (
    <main className="page">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title', { name: firstName })}
        subtitle={t('dashboard.subtitle')}
        action={
          <Link className={buttonClassName('primary')} to="/upload">
            <UploadIcon />
            {t('dashboard.uploadNew')}
          </Link>
        }
      />

      <section className="dashboard-hero">
        <div>
          <span className="hero-pill light">
            <ActivityIcon />
            {t('dashboard.pipeline')}
          </span>
          <h2>{t('dashboard.heroTitle')}</h2>
          <p>{t('dashboard.heroText')}</p>
        </div>
        <Link className={buttonClassName('secondary')} to="/upload">
          {t('dashboard.startAnalysis')}
        </Link>
      </section>

      <section className="summary-grid" aria-label={t('dashboard.summaryLabel')}>
        <SummaryCard icon={<VideoIcon />} label={t('dashboard.totalUploads')} value={totalUploads} />
        <SummaryCard icon={<ClockIcon />} label={t('dashboard.queuedJobs')} value={queuedJobs} />
        <SummaryCard icon={<ActivityIcon />} label={t('dashboard.processing')} value={processingJobs} />
        <SummaryCard icon={<CheckCircleIcon />} label={t('dashboard.completed')} value={completedAnalyses} />
        <SummaryCard icon={<AlertCircleIcon />} label={t('dashboard.failed')} value={failedJobs} tone="danger" />
      </section>

      <AppCard>
        <div className="card-header">
          <div>
            <h2>{t('dashboard.recentUploads')}</h2>
            <p>{t('dashboard.recentSubtitle')}</p>
          </div>
        </div>
        {historyQuery.isLoading && !historyQuery.data && <LoadingState text={t('dashboard.loadingHistory')} />}
        {historyQuery.error && !historyQuery.data && <ErrorMessage message={t('dashboard.historyError')} />}
        {!historyQuery.isLoading && !historyQuery.error && items.length === 0 && (
          <EmptyState
            icon={<UploadIcon />}
            title={t('dashboard.emptyTitle')}
            description={t('dashboard.emptyDescription')}
            action={
              <Link className={buttonClassName('primary')} to="/upload">
                {t('dashboard.uploadVideo')}
              </Link>
            }
          />
        )}
        {items.length > 0 && (
          <div className="table-shell">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('dashboard.videoName')}</th>
                  <th>{t('dashboard.status')}</th>
                  <th>{t('dashboard.jobStatus')}</th>
                  <th>{t('dashboard.progress')}</th>
                  <th>{t('dashboard.created')}</th>
                  <th>{t('dashboard.action')}</th>
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
                      <Link className={buttonClassName('outline')} to={getEffectiveStatus(item) === 'completed' ? `/analysis/${item.videoId}` : `/processing/${item.videoId}`}>
                        {getEffectiveStatus(item) === 'completed' ? t('dashboard.viewResult') : t('dashboard.viewStatus')}
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

function normalizeHistoryResponse(response: PagedResponse<VideoHistoryItem>) {
  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      latestJobProgress: clampProgress(item.latestJobProgress ?? 0),
    })),
  }
}

function mergeHistoryData(
  previousData: PagedResponse<VideoHistoryItem> | undefined,
  nextData: PagedResponse<VideoHistoryItem>,
) {
  if (!previousData) {
    return nextData
  }

  const previousByVideoId = new Map(previousData.items.map((item) => [item.videoId, item]))
  return {
    ...nextData,
    items: nextData.items.map((nextItem) => {
      const previousItem = previousByVideoId.get(nextItem.videoId)
      if (!previousItem || previousItem.latestJobId !== nextItem.latestJobId) {
        return nextItem
      }

      const nextStatus = getEffectiveStatus(nextItem)
      if (!isLiveStatus(nextStatus)) {
        return nextItem
      }

      const previousProgress = clampProgress(previousItem.latestJobProgress ?? 0)
      const nextProgress = clampProgress(nextItem.latestJobProgress ?? 0)
      return {
        ...nextItem,
        latestJobProgress: Math.max(previousProgress, nextProgress),
      }
    }),
  }
}

function hasLiveDashboardJobs(items: VideoHistoryItem[]) {
  return items.some((item) => isLiveStatus(getEffectiveStatus(item)))
}

function getEffectiveStatus(item: VideoHistoryItem) {
  return (item.latestJobStatus ?? item.status).toLowerCase()
}

function isLiveStatus(status: string) {
  return ['queued', 'processing', 'preparing', 'retrying', 'finalizing', 'pauserequested', 'paused', 'resumerequested', 'cancelrequested'].includes(status)
}

function isQueuedStatus(status: string) {
  return status === 'queued' || status === 'resumerequested'
}

function isProcessingStatus(status: string) {
  return ['processing', 'preparing', 'retrying', 'finalizing', 'pauserequested', 'paused', 'cancelrequested'].includes(status)
}

function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0
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
