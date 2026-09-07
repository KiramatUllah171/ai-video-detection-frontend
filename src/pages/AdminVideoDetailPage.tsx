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
import { useLanguage } from '../i18n/LanguageContext'
import {
  localizeDisplayMessage,
  localizeEvidenceTitle,
  localizeEvidenceType,
  localizeOriginTitle,
  localizeProviderValue,
  localizeVerdict,
} from '../i18n/localizeDynamicText'
import { fromVideoRouteId } from '../routes/videoRouteId'
import { formatAdminDate, formatFileSize, formatNullable, formatPercent } from './adminUtils'

export function AdminVideoDetailPage() {
  const { language, t } = useLanguage()
  const { videoId: routeVideoId } = useParams()
  const videoId = fromVideoRouteId(routeVideoId)
  const [videoState, setVideoState] = useState({ videoId: '', url: '', error: '' })
  const videoUrl = videoState.videoId === videoId ? videoState.url : ''
  const videoError = videoState.videoId === videoId ? videoState.error : ''
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
    getAdminVideoFile(videoId)
      .then((blob) => {
        if (!isMounted) {
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setVideoState({ videoId, url: objectUrl, error: '' })
      })
      .catch((error) => {
        if (isMounted) {
          setVideoState({ videoId, url: '', error: getApiErrorMessage(error, t) })
        }
      })

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [t, videoId])

  const detail = detailQuery.data
  const aiProbability = isFiniteNumber(detail?.video.aiGeneratedProbability)
    ? detail.video.aiGeneratedProbability
    : isFiniteNumber(detail?.analysis?.finalScore)
      ? detail.analysis.finalScore * 100
      : undefined

  return (
    <main className="page admin-page">
      <PageHeader
        eyebrow={t('admin.console')}
        title={detail?.video.originalName ?? t('admin.videoDetail.titleFallback')}
        subtitle={t('admin.videoDetail.subtitle')}
        action={<Link className={buttonClassName('outline')} to="/admin/videos">{t('admin.videoDetail.back')}</Link>}
      />

      {detailQuery.isLoading && <LoadingState text={t('admin.videoDetail.loading')} />}
      {detailQuery.error && <ErrorMessage message={getApiErrorMessage(detailQuery.error, t)} />}

      {detail && (
        <>
          <section className="admin-grid two admin-review-top">
            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.videoDetail.preview')}</h2>
                  <p>{t('admin.videoDetail.previewSubtitle')}</p>
                </div>
                <StatusBadge status={detail.video.status} />
              </div>
              {videoUrl ? (
                <video className="admin-video-player" src={videoUrl} controls playsInline preload="metadata" />
              ) : videoError ? (
                <ErrorMessage message={videoError} />
              ) : (
                <LoadingState text={t('admin.videoDetail.preparingPreview')} />
              )}
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.videoDetail.resultOverview')}</h2>
                  <p>{t('admin.videoDetail.resultSubtitle')}</p>
                </div>
              </div>
              <div className="admin-result-panel">
                <div>
                  <span>{t('admin.videoDetail.finalVerdict')}</span>
                  <strong>{localizeVerdict(detail.analysis?.label ?? detail.video.finalVerdict, t)}</strong>
                </div>
                <div className="admin-probability-line">
                  <span>{t('admin.videoDetail.aiProbability')}</span>
                  <b>{isFiniteNumber(aiProbability) ? `${aiProbability.toFixed(1)}%` : t('common.notAvailable')}</b>
                  <div><i style={{ width: `${Math.max(0, Math.min(100, aiProbability ?? 0))}%` }} /></div>
                </div>
                <div className="admin-compact-stats">
                  <span><strong>{detail.video.confidence?.toFixed(1) ?? formatPercent(detail.analysis?.confidence, 100, t('common.notAvailable'))}</strong>{t('admin.videoDetail.confidence')}</span>
                  <span><strong>{localizeProviderValue(detail.analysis?.providerMode, t)}</strong>{t('admin.videoDetail.mode')}</span>
                  <span><strong>{detail.analysis?.externalProviderName ? t('common.yes') : t('common.no')}</strong>{t('admin.videoDetail.external')}</span>
                </div>
                {detail.analysis?.summary && <p className="muted-copy">{localizeDisplayMessage(detail.analysis.summary, t)}</p>}
              </div>
            </AppCard>
          </section>

          <section className="admin-grid two">
            <KeyValueCard
              title={t('admin.videoDetail.reportOwner')}
              icon={<ShieldIcon />}
              rows={[
                [t('admin.videoDetail.name'), detail.video.ownerName],
                [t('admin.videoDetail.email'), detail.video.ownerEmail],
                [t('admin.videoDetail.uploaded'), formatAdminDate(detail.video.createdAt, t('common.notAvailable'), language)],
                [t('admin.videoDetail.lastUpdated'), formatAdminDate(detail.video.updatedAt, t('common.notAvailable'), language)],
              ]}
            />
            <KeyValueCard
              title={t('admin.videoDetail.videoInfo')}
              icon={<VideoIcon />}
              rows={[
                [t('admin.videoDetail.fileName'), detail.video.originalName],
                [t('admin.videoDetail.fileSize'), formatFileSize(detail.video.fileSize, t('common.notAvailable'))],
                [t('admin.videoDetail.contentType'), formatNullable(detail.video.contentType, t('common.notAvailable'))],
                [t('admin.videoDetail.duration'), detail.metadata?.durationSeconds ? `${detail.metadata.durationSeconds.toFixed(2)}s` : t('common.notAvailable')],
                [t('admin.videoDetail.resolution'), formatNullable(detail.metadata?.resolution, t('common.notAvailable'))],
                [t('admin.videoDetail.fps'), detail.metadata?.fps ? detail.metadata.fps.toString() : t('common.notAvailable')],
              ]}
            />
          </section>

          <section className="admin-grid two">
            <KeyValueCard
              title={t('admin.videoDetail.detectionBreakdown')}
              icon={<ActivityIcon />}
              rows={[
                [t('admin.videoDetail.visualScore'), formatPercent(detail.analysis?.visualScore, 100, t('common.notAvailable'))],
                [t('admin.videoDetail.metadataScore'), formatPercent(detail.analysis?.metadataScore, 100, t('common.notAvailable'))],
                [t('admin.videoDetail.temporalScore'), formatPercent(detail.analysis?.temporalScore, 100, t('common.notAvailable'))],
                [t('admin.videoDetail.finalWeightedScore'), formatPercent(detail.analysis?.finalScore, 100, t('common.notAvailable'))],
                [t('admin.videoDetail.decisionSource'), localizeProviderValue(detail.analysis?.finalDecisionSource, t)],
                [t('admin.videoDetail.externalStatus'), localizeProviderValue(detail.analysis?.externalProviderStatus, t)],
              ]}
            />
            <KeyValueCard
              title={t('admin.videoDetail.metadataSummary')}
              icon={<FileVideoIcon />}
              rows={[
                [t('admin.videoDetail.videoCodec'), formatNullable(detail.metadata?.codec, t('common.notAvailable'))],
                [t('admin.videoDetail.audioCodec'), formatNullable(detail.metadata?.audioCodec, t('common.notAvailable'))],
                [t('admin.videoDetail.bitrate'), detail.metadata?.bitrate?.toLocaleString() ?? t('common.notAvailable')],
                [t('admin.videoDetail.encoder'), formatNullable(detail.metadata?.encoder, t('common.notAvailable'))],
                [t('admin.videoDetail.creationTime'), formatAdminDate(detail.metadata?.creationTime, t('common.notAvailable'), language)],
                [t('admin.videoDetail.missingMetadata'), detail.metadata?.hasMissingMetadata ? t('common.yes') : t('common.no')],
              ]}
            />
          </section>

          <AppCard className="admin-section-card">
            <div className="card-header compact">
              <div>
                <h2>{t('admin.videoDetail.processingJobs')}</h2>
                <p>{t('admin.videoDetail.jobsSubtitle')}</p>
              </div>
            </div>
            {detail.jobs.length === 0 ? (
              <EmptyState icon={<ActivityIcon />} title={t('admin.videoDetail.noJobsTitle')} description={t('admin.videoDetail.noJobsDescription')} />
            ) : (
              <div className="admin-card-list">
                {detail.jobs.map((job) => (
                  <div className="admin-detail-card" key={`${job.status}-${job.createdAt}`}>
                    <div>
                      <StatusBadge status={job.status} />
                      <strong>{job.currentStep ? localizeDisplayMessage(job.currentStep, t) : t('admin.videoDetail.processingJob')}</strong>
                      <span>{job.errorMessage ? localizeDisplayMessage(job.errorMessage, t) : t('admin.videoDetail.retryOf', { current: job.retryCount, max: job.maxRetryCount })}</span>
                    </div>
                    <div className="admin-detail-progress">
                      <ProgressBar value={job.progress} status={job.status} />
                      <small>{formatAdminDate(job.updatedAt, t('common.notAvailable'), language)}</small>
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
                  <h2>{t('admin.videoDetail.evidence')}</h2>
                  <p>{t('admin.videoDetail.evidenceSubtitle')}</p>
                </div>
              </div>
              {detail.evidence.length === 0 ? (
                <p className="muted-copy">{t('admin.videoDetail.noEvidence')}</p>
              ) : (
                <div className="admin-card-list admin-scroll-list admin-scroll-list-cards">
                  {detail.evidence.map((item) => (
                    <div className="admin-detail-card" key={`${item.title}-${item.description}`}>
                      <div>
                        <StatusBadge status={item.severity} />
                        <strong>{localizeEvidenceTitle(item.title, t)}</strong>
                        <span>{localizeEvidenceType(item.type, t)} - {t('admin.videoDetail.impact', { impact: item.scoreImpact?.toFixed(2) ?? t('common.notAvailable') })}</span>
                      </div>
                      <p>{localizeDisplayMessage(item.description, t)}</p>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>

            <AppCard className="admin-section-card">
              <div className="card-header compact">
                <div>
                  <h2>{t('admin.videoDetail.originTracking')}</h2>
                  <p>{t('admin.videoDetail.originSubtitle')}</p>
                </div>
              </div>
              {detail.originMatches.length === 0 ? (
                <p className="muted-copy">{t('admin.videoDetail.noOrigin')}</p>
              ) : (
                <div className="admin-card-list admin-scroll-list admin-scroll-list-cards">
                  {detail.originMatches.map((match) => (
                    <div className="admin-detail-card" key={`${match.rank}-${match.title}-${match.similarityScore}`}>
                      <div>
                        <StatusBadge status={match.confidence} />
                        <strong>{localizeOriginTitle(match.title, t)}</strong>
                        <span>{localizeProviderValue(match.platform, t)} - {t('admin.videoDetail.similarity', { value: formatPercent(match.similarityScore, 100, t('common.notAvailable')) })}</span>
                      </div>
                      <small>{formatAdminDate(match.uploadDatetime, t('common.notAvailable'), language)}</small>
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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
