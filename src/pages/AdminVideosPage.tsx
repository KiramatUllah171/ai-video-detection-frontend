import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminVideos, getApiErrorMessage } from '../api/client'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FileVideoIcon, VideoIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { localizeVerdict } from '../i18n/localizeDynamicText'
import { toVideoRouteId } from '../routes/videoRouteId'
import { formatAdminDate, formatFileSize, formatNullable } from './adminUtils'

const pageSize = 20

export function AdminVideosPage() {
  const { language, t } = useLanguage()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const videosQuery = useQuery({
    queryKey: ['admin-videos', page, search, status],
    queryFn: () => getAdminVideos({ page, pageSize, search: search.trim() || undefined, status: status || undefined }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 10000,
  })

  const videos = videosQuery.data?.items ?? []

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow={t('admin.console')}
        title={t('admin.videos.title')}
        subtitle={t('admin.videos.subtitle')}
        action={<span className="hero-pill light"><VideoIcon />{t('admin.videos.count', { count: videosQuery.data?.totalCount.toLocaleString() ?? 0 })}</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>{t('admin.videos.uploaded')}</h2>
            <p>{t('admin.videos.uploadedSubtitle')}</p>
          </div>
        </div>

        <div className="admin-filter-grid two">
          <label>
            <span>{t('admin.videos.search')}</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t('admin.videos.searchPlaceholder')}
            />
          </label>
          <label>
            <span>{t('admin.users.status')}</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('admin.videos.all')}</option>
              <option value="Queued">{t('status.queued')}</option>
              <option value="Processing">{t('status.processing')}</option>
              <option value="Completed">{t('status.completed')}</option>
              <option value="Failed">{t('status.failed')}</option>
            </select>
          </label>
        </div>

        {videosQuery.isLoading && <LoadingState text={t('admin.videos.loading')} />}
        {videosQuery.error && <ErrorMessage message={getApiErrorMessage(videosQuery.error, t)} />}

        {videos.length > 0 && (
          <div className="table-shell">
            <table className="premium-table admin-table admin-table-relaxed">
              <thead>
                <tr>
                  <th>{t('admin.videos.video')}</th>
                  <th>{t('admin.videos.owner')}</th>
                  <th>{t('admin.users.status')}</th>
                  <th>{t('admin.videos.job')}</th>
                  <th>{t('admin.videos.result')}</th>
                  <th>{t('admin.videos.uploadedAt')}</th>
                  <th>{t('admin.users.action')}</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={`${video.ownerEmail}-${video.originalName}-${video.createdAt}`}>
                    <td>
                      <div className="video-cell">
                        <span className="file-icon"><FileVideoIcon /></span>
                        <div>
                          <strong>{video.originalName}</strong>
                          <span>{formatFileSize(video.fileSize, t('common.notAvailable'))} - {formatNullable(video.contentType, t('common.notAvailable'))}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-mini-counts">
                        <strong>{video.ownerName}</strong>
                        <span>{video.ownerEmail}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={video.status} /></td>
                    <td>
                      <StatusBadge status={video.latestJobStatus ?? 'Not started'} />
                      <ProgressBar value={video.latestJobProgress ?? 0} status={video.latestJobStatus} />
                    </td>
                    <td>
                      <div className="admin-mini-counts">
                        <span>{localizeVerdict(video.finalVerdict, t)}</span>
                        <span>{isFiniteNumber(video.aiGeneratedProbability) ? `${video.aiGeneratedProbability.toFixed(1)}% ${t('admin.videos.aiSuffix')}` : t('admin.videos.noScore')}</span>
                      </div>
                    </td>
                    <td>{formatAdminDate(video.createdAt, t('common.notAvailable'), language)}</td>
                    <td>
                      <Link className={buttonClassName('primary')} to={`/admin/videos/${toVideoRouteId(video.videoId)}`}>
                        {t('admin.videos.review')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!videosQuery.isLoading && videos.length === 0 && <p className="muted-copy">{t('admin.videos.empty')}</p>}
        <div className="admin-pagination">
          <button type="button" className={buttonClassName('outline')} disabled={(videosQuery.data?.page ?? page) <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <span>{t('common.pageOf', { page: videosQuery.data?.page ?? page, totalPages: Math.max(1, videosQuery.data?.totalPages ?? 1) })}</span>
          <button type="button" className={buttonClassName('outline')} disabled={(videosQuery.data?.page ?? page) >= (videosQuery.data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      </AppCard>
    </main>
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
