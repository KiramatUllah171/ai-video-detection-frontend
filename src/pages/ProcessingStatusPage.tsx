import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient, cancelAnalysis, getAnalysisResult, getApiErrorMessage, retryAnalysis } from '../api/client'
import type { ApiResponse, JobStatus } from '../api/types'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, FileVideoIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'

export function ProcessingStatusPage() {
  const { videoId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const redirectStartedRef = useRef(false)
  const [retryLockedJobId, setRetryLockedJobId] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const statusQuery = useQuery({
    queryKey: ['job-status', videoId],
    enabled: Boolean(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.status.toLowerCase()
      return status === 'completed' || status === 'failed' || status === 'cancelled' ? false : 3000
    },
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<JobStatus>>(`/api/jobs/${videoId}/status`)
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.errors[0] ?? response.data.message)
      }
      return response.data.data
    },
  })

  const status = statusQuery.data
  const message = getStatusMessage(status?.status, t)
  const statusIcon = getStatusIcon(status?.status)
  const statusName = status?.status.toLowerCase()
  const isFailed = statusName === 'failed'
  const isCompleted = statusName === 'completed'
  const canCancel = statusName ? ['queued', 'preparing', 'processing', 'retrying', 'finalizing', 'cancelrequested'].includes(statusName) : false
  const safeErrorMessage = status?.userMessage ?? status?.errorMessage ?? t('processing.defaultError')
  const retryMutation = useMutation({
    mutationFn: () => retryAnalysis(videoId!),
    onSuccess: async (response) => {
      redirectStartedRef.current = false
      await queryClient.invalidateQueries({ queryKey: ['analysis-result', videoId] })
      queryClient.setQueryData<JobStatus>(['job-status', videoId], (current) => ({
        jobId: response.jobId,
        videoId: response.videoId,
        status: response.jobStatus,
        progress: 0,
        currentStep: t('processing.waitingWorker'),
        retryCount: response.retryCount,
        maxRetryCount: response.maxRetryCount,
        createdAt: current?.createdAt ?? new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      }))
      await statusQuery.refetch()
    },
    onError: () => {
      setRetryLockedJobId(null)
    },
  })
  const retryLocked = status ? retryLockedJobId === status.jobId : false
  const cancelMutation = useMutation({
    mutationFn: () => cancelAnalysis(videoId!),
    onSuccess: async (nextStatus) => {
      setCancelError(null)
      queryClient.setQueryData<JobStatus>(['job-status', videoId], nextStatus)
      if (nextStatus.status.toLowerCase() === 'cancelled' || nextStatus.status.toLowerCase() === 'cancelrequested') {
        navigate('/upload', { replace: true, state: { message: 'Analysis cancelled.' } })
        return
      }
      await statusQuery.refetch()
    },
    onError: (error) => {
      setCancelError(getApiErrorMessage(error, t) || "We couldn't confirm that processing was cancelled. Please try again. Your video is still safe.")
    },
  })

  useEffect(() => {
    if (!videoId || !isCompleted || redirectStartedRef.current) {
      return
    }

    redirectStartedRef.current = true
    let cancelled = false
    const delays = [350, 800, 1400, 2200]

    async function navigateWhenResultIsReady() {
      for (const delayMs of delays) {
        await wait(delayMs)
        if (cancelled) {
          return
        }

        try {
          await getAnalysisResult(videoId!)
          if (!cancelled) {
            navigate(`/analysis/${videoId}`, { replace: true })
          }
          return
        } catch {
          // Result persistence can lag job completion briefly.
        }
      }

      if (!cancelled) {
        navigate(`/analysis/${videoId}`, { replace: true })
      }
    }

    void navigateWhenResultIsReady()
    return () => {
      cancelled = true
    }
  }, [isCompleted, navigate, videoId])

  return (
    <main className="page">
      <PageHeader
        eyebrow={t('processing.eyebrow')}
        title={t('processing.title')}
        subtitle={t('processing.subtitle')}
      />

      {statusQuery.isLoading && <LoadingState text={t('processing.loading')} />}
      {statusQuery.error && <ErrorMessage message={getApiErrorMessage(statusQuery.error, t)} />}
      {status && (
        <AppCard className="status-card">
          <div className={`status-hero status-hero-${status.status.toLowerCase()}`}>
            <div className="status-icon">
              {statusIcon}
            </div>
            <div>
              <StatusBadge status={status.status} />
              <h2>{message.title}</h2>
              <p>{message.description}</p>
            </div>
          </div>
          {!cancelError && (
            <div className="status-progress-panel">
              <div>
                <span>{t('processing.progress')}</span>
                <strong>{formatPercent(status.progress)}</strong>
              </div>
              <ProgressBar value={status.progress ?? 0} status={status.status} showLabel={false} />
            </div>
          )}
          {status.totalSegments ? (
            <div className="success-panel">
              <div>
                <strong>{status.scanMode ?? 'Smart Scan'}</strong>
                <span>
                  {t('processing.segmentProgress', {
                    completed: status.completedSegments ?? 0,
                    total: status.totalSegments,
                  })}
                </span>
              </div>
            </div>
          ) : null}
          <div className="detail-grid">
            <DetailItem label={t('processing.jobId')} value={String(status.jobId)} icon={<ActivityIcon />} />
            <DetailItem label={t('processing.videoId')} value={String(status.videoId)} icon={<FileVideoIcon />} />
            <DetailItem label={t('processing.currentStep')} value={formatSafeStatusText(status.currentStep, t)} icon={<ClockIcon />} />
            <DetailItem label={t('processing.retryAttempt')} value={t('processing.attempt', { current: Math.min(status.retryCount + 1, status.maxRetryCount), max: status.maxRetryCount })} icon={<AlertCircleIcon />} />
            <DetailItem label={t('processing.created')} value={dayjs(status.createdAt).format('MMM D, YYYY h:mm A')} icon={<ClockIcon />} />
            <DetailItem label={t('processing.lastUpdated')} value={formatLastUpdated(status, t)} icon={<ActivityIcon />} />
          </div>
          {cancelError && (
            <div className="failed-panel" role="alert">
              <div>
                <h3>{t('processing.cancelUnconfirmedTitle')}</h3>
                <p>{t('processing.cancelUnconfirmedDescription')}</p>
              </div>
              <ErrorMessage message={cancelError} />
            </div>
          )}
          {isFailed && (
            <div className="failed-panel" role="alert">
              <div>
                <h3>{t('processing.failedTitle')}</h3>
                <p>{safeErrorMessage}</p>
                {status.technicalReferenceId && <small>{t('processing.reference', { id: status.technicalReferenceId })}</small>}
              </div>
              {retryMutation.error && <ErrorMessage message={getApiErrorMessage(retryMutation.error, t)} />}
            </div>
          )}
          {isCompleted && (
            <div className="success-panel">
              <CheckCircleIcon />
              <div>
                <strong>{t('processing.completedStrong')}</strong>
                <span>{t('processing.openingResult')}</span>
              </div>
            </div>
          )}
          <div className="status-actions">
            {canCancel && (
              <AppButton
                type="button"
                variant="outline"
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
                onClick={() => {
                  if (!window.confirm('Cancel this analysis? Processing will stop, but your uploaded video will remain available.')) {
                    return
                  }
                  setCancelError(null)
                  cancelMutation.mutate()
                }}
              >
                {cancelMutation.isPending ? t('processing.cancelling') : t('processing.cancelAnalysis')}
              </AppButton>
            )}
            {cancelError && (
              <AppButton type="button" variant="outline" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                {t('processing.retryCancellation')}
              </AppButton>
            )}
            {cancelError && (
              <AppButton type="button" variant="ghost" onClick={() => statusQuery.refetch()}>
                {t('processing.refreshStatus')}
              </AppButton>
            )}
            {isFailed && (
              <AppButton
                type="button"
                onClick={() => {
                  if (retryLocked || retryMutation.isPending) {
                    return
                  }
                  setRetryLockedJobId(status.jobId)
                  retryMutation.mutate()
                }}
                loading={retryMutation.isPending}
                disabled={retryLocked || retryMutation.isPending || status.canRetry === false}
                icon={<ActivityIcon />}
              >
                {retryMutation.isPending ? t('processing.retrying') : t('processing.retryAnalysis')}
              </AppButton>
            )}
            {isCompleted && (
              <Link className={buttonClassName('primary')} to={`/analysis/${status.videoId}`}>
                {t('processing.viewResult')}
              </Link>
            )}
            <Link className={buttonClassName('outline')} to="/dashboard">
              {t('processing.backDashboard')}
            </Link>
            {isFailed && (
              <Link className={buttonClassName('ghost')} to="/upload">
                {t('processing.uploadAnother')}
              </Link>
            )}
          </div>
        </AppCard>
      )}
    </main>
  )
}

function DetailItem({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="detail-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function getStatusMessage(status: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  switch (status?.toLowerCase()) {
    case 'processing':
      return {
        title: t('processing.statusProcessingTitle'),
        description: t('processing.statusProcessingDescription'),
      }
    case 'completed':
      return {
        title: t('processing.statusCompletedTitle'),
        description: t('processing.statusCompletedDescription'),
      }
    case 'failed':
      return {
            title: t('processing.failedTitle'),
            description: t('processing.statusFailedDescription'),
      }
    default:
      return {
        title: t('processing.statusQueuedTitle'),
        description: t('processing.statusQueuedDescription'),
      }
  }
}

function wait(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs))
}

function getStatusIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case 'processing':
      return <ActivityIcon />
    case 'completed':
      return <CheckCircleIcon />
    case 'failed':
      return <AlertCircleIcon />
    default:
      return <ClockIcon />
  }
}

function formatLastUpdated(status: JobStatus, t: ReturnType<typeof useLanguage>['t']) {
  const updatedAt = status.lastActivityAt ?? status.lastUpdatedAt ?? status.completedAt
  if (updatedAt) {
    return dayjs(updatedAt).format('MMM D, YYYY h:mm A')
  }

  const statusName = status.status.toLowerCase()
  return statusName === 'queued' || statusName === 'processing' || statusName === 'retrying' || statusName === 'preparing'
    ? t('processing.polling')
    : t('processing.notAvailable')
}

function formatPercent(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : 'Calculating...'
}

function formatSafeStatusText(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  if (!value) {
    return t('processing.waitingWorker')
  }

  return value
    .replace(/External\s+BitMind\s+verification/gi, 'External verification')
    .replace(/BitMind/gi, 'external verification')
}
