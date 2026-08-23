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
import { toVideoRouteId } from '../routes/videoRouteId'
import { formatAdminDate, formatFileSize, formatNullable } from './adminUtils'

const pageSize = 20

export function AdminVideosPage() {
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
        eyebrow="Admin console"
        title="Video review"
        subtitle="Open any uploaded video, inspect owner details, playback, processing jobs, detection output, evidence, and origin matches."
        action={<span className="hero-pill light"><VideoIcon />{videosQuery.data?.totalCount.toLocaleString() ?? 0} videos</span>}
      />

      <AppCard className="admin-section-card admin-table-card">
        <div className="card-header compact">
          <div>
            <h2>Uploaded videos</h2>
            <p>Search all uploaded media and open an admin review when required.</p>
          </div>
        </div>

        <div className="admin-filter-grid two">
          <label>
            <span>Search videos</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="File name, owner, or email"
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All videos</option>
              <option value="Queued">Queued</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
          </label>
        </div>

        {videosQuery.isLoading && <LoadingState text="Loading videos..." />}
        {videosQuery.error && <ErrorMessage message={getApiErrorMessage(videosQuery.error)} />}

        {videos.length > 0 && (
          <div className="table-shell">
            <table className="premium-table admin-table admin-table-relaxed">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Job</th>
                  <th>Result</th>
                  <th>Uploaded</th>
                  <th>Action</th>
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
                          <span>{formatFileSize(video.fileSize)} • {formatNullable(video.contentType)}</span>
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
                        <span>{video.finalVerdict ?? 'Not available'}</span>
                        <span>{video.aiGeneratedProbability !== undefined ? `${video.aiGeneratedProbability.toFixed(1)}% AI` : 'No score'}</span>
                      </div>
                    </td>
                    <td>{formatAdminDate(video.createdAt)}</td>
                    <td>
                      <Link className={buttonClassName('primary')} to={`/admin/videos/${toVideoRouteId(video.videoId)}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!videosQuery.isLoading && videos.length === 0 && <p className="muted-copy">No videos matched this filter.</p>}
        <div className="admin-pagination">
          <button type="button" className={buttonClassName('outline')} disabled={(videosQuery.data?.page ?? page) <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {videosQuery.data?.page ?? page} of {Math.max(1, videosQuery.data?.totalPages ?? 1)}</span>
          <button type="button" className={buttonClassName('outline')} disabled={(videosQuery.data?.page ?? page) >= (videosQuery.data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </AppCard>
    </main>
  )
}
