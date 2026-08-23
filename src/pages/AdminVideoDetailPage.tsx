import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminVideoDetail, getAdminVideoFile, getApiErrorMessage } from '../api/client'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, FileVideoIcon, ShieldIcon, VideoIcon } from '../components/ui/icons'
import { fromVideoRouteId } from '../routes/videoRouteId'
import { formatAdminDate, formatFileSize, formatNullable, formatPercent } from './adminUtils'

export function AdminVideoDetailPage() {
  const { videoId: routeVideoId } = useParams()
  const videoId = fromVideoRouteId(routeVideoId)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')
  const detailQuery = useQuery({
    queryKey: ['admin-video-detail', videoId],
    enabled: Boolean(videoId),
    queryFn: () => getAdminVideoDetail(videoId),
  })

  useEffect(() => {
    if (!videoId) {
      return
    }

    let isMounted = true
    let objectUrl = ''
    setVideoError('')
    setVideoUrl('')
    getAdminVideoFile(videoId)
      .then((blob) => {
        if (!isMounted) {
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setVideoUrl(objectUrl)
      })
      .catch((error) => {
        if (isMounted) {
          setVideoError(getApiErrorMessage(error))
        }
      })

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [videoId])

  const detail = detailQuery.data

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow="Admin console"
        title={detail?.video.originalName ?? 'Video review'}
        subtitle="Inspect the uploaded media, account ownership, detection output, processing jobs, evidence, and origin matches."
        action={<Link className={buttonClassName('outline')} to="/admin/videos">Back to videos</Link>}
      />

      {detailQuery.isLoading && <LoadingState text="Loading video review..." />}
      {detailQuery.error && <ErrorMessage message={getApiErrorMessage(detailQuery.error)} />}

      {detail && (
        <>
          <section className="admin-grid two admin-review-top">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Video preview</h2>
                  <p>Admin-only playback from protected storage.</p>
                </div>
                <StatusBadge status={detail.video.status} />
              </div>
              {videoUrl ? (
                <video className="admin-video-player" src={videoUrl} controls preload="metadata" />
              ) : videoError ? (
                <ErrorMessage message={videoError} />
              ) : (
                <LoadingState text="Preparing video preview..." />
              )}
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Result overview</h2>
                  <p>Latest available decision for this upload.</p>
                </div>
              </div>
              <div className="admin-result-panel">
                <div>
                  <span>Final verdict</span>
                  <strong>{detail.analysis?.label ?? detail.video.finalVerdict ?? 'Not available'}</strong>
                </div>
                <div className="admin-probability-line">
                  <span>AI / manipulated probability</span>
                  <b>{detail.video.aiGeneratedProbability !== undefined ? `${detail.video.aiGeneratedProbability.toFixed(1)}%` : formatPercent(detail.analysis?.finalScore, 100)}</b>
                  <div><i style={{ width: `${Math.max(0, Math.min(100, detail.video.aiGeneratedProbability ?? ((detail.analysis?.finalScore ?? 0) * 100)))}%` }} /></div>
                </div>
                <div className="admin-compact-stats">
                  <span><strong>{detail.video.confidence?.toFixed(1) ?? formatPercent(detail.analysis?.confidence, 100)}</strong>Confidence</span>
                  <span><strong>{detail.analysis?.providerMode ?? 'Not available'}</strong>Mode</span>
                  <span><strong>{detail.analysis?.externalProviderName ? 'Yes' : 'No'}</strong>External</span>
                </div>
                {detail.analysis?.summary && <p className="muted-copy">{detail.analysis.summary}</p>}
              </div>
            </AppCard>
          </section>

          <section className="admin-grid two">
            <KeyValueCard
              title="Report owner"
              icon={<ShieldIcon />}
              rows={[
                ['Name', detail.video.ownerName],
                ['Email', detail.video.ownerEmail],
                ['Uploaded', formatAdminDate(detail.video.createdAt)],
                ['Last updated', formatAdminDate(detail.video.updatedAt)],
              ]}
            />
            <KeyValueCard
              title="Video information"
              icon={<VideoIcon />}
              rows={[
                ['File name', detail.video.originalName],
                ['File size', formatFileSize(detail.video.fileSize)],
                ['Content type', formatNullable(detail.video.contentType)],
                ['Duration', detail.metadata?.durationSeconds ? `${detail.metadata.durationSeconds.toFixed(2)}s` : 'Not available'],
                ['Resolution', formatNullable(detail.metadata?.resolution)],
                ['FPS', detail.metadata?.fps ? detail.metadata.fps.toString() : 'Not available'],
              ]}
            />
          </section>

          <section className="admin-grid two">
            <KeyValueCard
              title="Detection breakdown"
              icon={<ActivityIcon />}
              rows={[
                ['Visual score', formatPercent(detail.analysis?.visualScore, 100)],
                ['Metadata score', formatPercent(detail.analysis?.metadataScore, 100)],
                ['Temporal score', formatPercent(detail.analysis?.temporalScore, 100)],
                ['Final weighted score', formatPercent(detail.analysis?.finalScore, 100)],
                ['Decision source', formatNullable(detail.analysis?.finalDecisionSource)],
                ['External status', formatNullable(detail.analysis?.externalProviderStatus)],
              ]}
            />
            <KeyValueCard
              title="Metadata summary"
              icon={<FileVideoIcon />}
              rows={[
                ['Video codec', formatNullable(detail.metadata?.codec)],
                ['Audio codec', formatNullable(detail.metadata?.audioCodec)],
                ['Bitrate', detail.metadata?.bitrate?.toLocaleString() ?? 'Not available'],
                ['Encoder', formatNullable(detail.metadata?.encoder)],
                ['Creation time', formatAdminDate(detail.metadata?.creationTime)],
                ['Missing metadata', detail.metadata?.hasMissingMetadata ? 'Yes' : 'No'],
              ]}
            />
          </section>

          <AppCard className="admin-section-card">
            <div className="card-header compact">
              <div>
                <h2>Processing jobs</h2>
                <p>Latest pipeline state and retry information.</p>
              </div>
            </div>
            {detail.jobs.length === 0 ? (
              <EmptyState icon={<ActivityIcon />} title="No processing jobs found" description="This video does not have job records yet." />
            ) : (
              <div className="admin-card-list">
                {detail.jobs.map((job) => (
                  <div className="admin-detail-card" key={`${job.status}-${job.createdAt}`}>
                    <div>
                      <StatusBadge status={job.status} />
                      <strong>{job.currentStep ?? 'Processing job'}</strong>
                      <span>{job.errorMessage ?? `Retry ${job.retryCount} of ${job.maxRetryCount}`}</span>
                    </div>
                    <div className="admin-detail-progress">
                      <ProgressBar value={job.progress} status={job.status} />
                      <small>{formatAdminDate(job.updatedAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppCard>

          <section className="admin-grid two">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Evidence</h2>
                  <p>Signals that influenced reviewer context.</p>
                </div>
              </div>
              {detail.evidence.length === 0 ? (
                <p className="muted-copy">No evidence items were generated for this analysis.</p>
              ) : (
                <div className="admin-card-list admin-scroll-list admin-scroll-list-cards">
                  {detail.evidence.map((item) => (
                    <div className="admin-detail-card" key={`${item.title}-${item.description}`}>
                      <div>
                        <StatusBadge status={item.severity} />
                        <strong>{item.title}</strong>
                        <span>{item.type} • Impact {item.scoreImpact?.toFixed(2) ?? 'Not available'}</span>
                      </div>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>Origin tracking</h2>
                  <p>Internal fingerprint and metadata matches.</p>
                </div>
              </div>
              {detail.originMatches.length === 0 ? (
                <p className="muted-copy">No origin matches were found.</p>
              ) : (
                <div className="admin-card-list admin-scroll-list admin-scroll-list-cards">
                  {detail.originMatches.map((match) => (
                    <div className="admin-detail-card" key={`${match.rank}-${match.title}-${match.similarityScore}`}>
                      <div>
                        <StatusBadge status={match.confidence} />
                        <strong>{match.title ?? 'Previously analyzed internal video'}</strong>
                        <span>{match.platform} • {formatPercent(match.similarityScore, 100)} similarity</span>
                      </div>
                      <small>{formatAdminDate(match.uploadDatetime)}</small>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>
          </section>
        </>
      )}
    </main>
  )
}

function KeyValueCard({ title, icon, rows }: { title: string; icon: ReactNode; rows: Array<[string, string]> }) {
  return (
    <AppCard className="admin-section-card admin-kv-card">
      <div className="card-header compact">
        <div>
          <h2>{title}</h2>
        </div>
        <span className="summary-icon">{icon}</span>
      </div>
      <div className="admin-kv-list">
        {rows.map(([label, value]) => (
          <div className="admin-kv-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </AppCard>
  )
}
