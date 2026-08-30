import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient, cancelAnalysis, getAnalysisResult, getApiErrorMessage, pauseAnalysis, reanalyzeVideo, resumeAnalysis, retryAnalysis } from '../api/client'
import type { ApiResponse, JobStatus } from '../api/types'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppModal } from '../components/ui/AppModal'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, FileVideoIcon } from '../components/ui/icons'
import { useLanguage, type LanguageCode } from '../i18n/LanguageContext'
import { formatLocalizedDateTime } from '../i18n/formatDate'
import { localizeDisplayMessage } from '../i18n/localizeDynamicText'
import { fromVideoRouteId, toVideoRouteId } from '../routes/videoRouteId'

export function ProcessingStatusPage() {
  const { videoId: routeVideoId } = useParams()
  const videoId = fromVideoRouteId(routeVideoId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { language, t } = useLanguage()
  const redirectStartedRef = useRef(false)
  const [retryLockedJobId, setRetryLockedJobId] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [pauseError, setPauseError] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [pauseModalOpen, setPauseModalOpen] = useState(false)
  const statusQuery = useQuery({
    queryKey: ['job-status', videoId],
    enabled: Boolean(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.status.toLowerCase()
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return false
      }
      return status === 'paused' ? 10000 : 3000
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
  const statusContent = getStatusContent(status?.status, t)
  const statusIcon = getStatusIcon(status?.status)
  const statusName = status?.status.toLowerCase()
  const isFailed = statusName === 'failed'
  const isCompleted = statusName === 'completed'
  const isCancelled = statusName === 'cancelled'
  const isPaused = statusName === 'paused'
  const isPauseRequested = statusName === 'pauserequested'
  const isResumeRequested = statusName === 'resumerequested'
  const canPause = statusName ? ['queued', 'preparing', 'processing', 'retrying', 'finalizing'].includes(statusName) : false
  const canResume = isPaused
  const canCancel = statusName ? ['queued', 'preparing', 'processing', 'retrying', 'finalizing', 'pauserequested', 'paused', 'resumerequested'].includes(statusName) : false
  const safeErrorMessage = status
    ? localizeDisplayMessage(status.userMessage ?? status.errorMessage ?? t('processing.defaultError'), t)
    : t('processing.defaultError')
  const scanType = formatScanMode(status?.scanMode, t)
  const originalName = status?.originalName?.trim() || t('processing.notAvailable')
  const retryMutation = useMutation({
    mutationFn: () => retryAnalysis(videoId!),
    onSuccess: async (response) => {
      redirectStartedRef.current = false
      await queryClient.invalidateQueries({ queryKey: ['analysis-result', videoId] })
      queryClient.setQueryData<JobStatus>(['job-status', videoId], (current) => ({
        jobId: response.jobId,
        videoId: response.videoId,
        originalName: current?.originalName ?? response.originalName,
        status: response.jobStatus,
        progress: 0,
        currentStep: t('processing.waitingWorker'),
        scanMode: current?.scanMode,
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
  const reanalyzeMutation = useMutation({
    mutationFn: () => reanalyzeVideo(videoId!),
    onSuccess: async (response) => {
      redirectStartedRef.current = false
      await queryClient.invalidateQueries({ queryKey: ['analysis-result', videoId] })
      queryClient.setQueryData<JobStatus>(['job-status', videoId], (current) => ({
        jobId: response.jobId,
        videoId: response.videoId,
        originalName: current?.originalName ?? response.originalName,
        status: response.jobStatus,
        progress: 0,
        currentStep: t('processing.waitingWorker'),
        scanMode: current?.scanMode,
        retryCount: response.retryCount,
        maxRetryCount: response.maxRetryCount,
        createdAt: current?.createdAt ?? new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      }))
      await statusQuery.refetch()
    },
  })
  const retryLocked = status ? retryLockedJobId === status.jobId : false
  const pauseMutation = useMutation({
    mutationFn: () => pauseAnalysis(videoId!),
    onSuccess: async (nextStatus) => {
      setPauseError(null)
      setPauseModalOpen(false)
      queryClient.setQueryData<JobStatus>(['job-status', videoId], nextStatus)
      await statusQuery.refetch()
    },
    onError: (error) => {
      setPauseError(getApiErrorMessage(error, t) || t('processing.pauseUnconfirmedDescription'))
    },
  })
  const resumeMutation = useMutation({
    mutationFn: () => resumeAnalysis(videoId!),
    onSuccess: async (nextStatus) => {
      setResumeError(null)
      queryClient.setQueryData<JobStatus>(['job-status', videoId], nextStatus)
      await statusQuery.refetch()
    },
    onError: (error) => {
      setResumeError(getApiErrorMessage(error, t) || t('processing.resumeUnconfirmedDescription'))
    },
  })
  const cancelMutation = useMutation({
    mutationFn: () => cancelAnalysis(videoId!),
    onSuccess: async (nextStatus) => {
      setCancelError(null)
      setPauseError(null)
      setResumeError(null)
      setCancelModalOpen(false)
      setPauseModalOpen(false)
      queryClient.setQueryData<JobStatus>(['job-status', videoId], nextStatus)
      await statusQuery.refetch()
    },
    onError: (error) => {
      setCancelError(getApiErrorMessage(error, t) || t('processing.cancelUnconfirmedDescription'))
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
            navigate(`/analysis/${toVideoRouteId(videoId)}`, { replace: true })
          }
          return
        } catch {
          // Result persistence can lag job completion briefly.
        }
      }

      if (!cancelled) {
        navigate(`/analysis/${toVideoRouteId(videoId)}`, { replace: true })
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
        <AppCard
          className="status-card"
          aria-busy={pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending}
        >
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {statusContent.title}
          </div>
          <div className={`status-hero status-hero-${status.status.toLowerCase()}`}>
            <div className="status-icon">
              {statusIcon}
            </div>
            <div>
              <StatusBadge status={status.status} />
              <h2>{statusContent.title}</h2>
              <p>{statusContent.description}</p>
            </div>
          </div>
          <div className="status-progress-panel">
            <div>
              <span>{t('processing.progress')}</span>
              <strong>{formatPercent(status.progress, t)}</strong>
            </div>
            <ProgressBar value={status.progress ?? 0} status={status.status} showLabel={false} />
          </div>
          <ScanStatusPanel status={status} scanType={scanType} />
          <div className="detail-grid">
            <DetailItem label={t('processing.videoFile')} value={originalName} icon={<FileVideoIcon />} title={originalName} truncate />
            <DetailItem label={t('processing.scanType')} value={scanType} icon={<ActivityIcon />} />
            <DetailItem label={t('processing.currentStep')} value={formatSafeStatusText(status.currentStep, t)} icon={<ClockIcon />} />
            <DetailItem label={t('processing.retryAttempt')} value={t('processing.attempt', { current: Math.min(status.retryCount + 1, status.maxRetryCount), max: status.maxRetryCount })} icon={<AlertCircleIcon />} />
            <DetailItem label={t('processing.created')} value={formatLocalizedDateTime(status.createdAt, language, t('processing.notAvailable'))} icon={<ClockIcon />} />
            <DetailItem label={t('processing.lastUpdated')} value={formatLastUpdated(status, language, t)} icon={<ActivityIcon />} />
          </div>
          <div className="retention-panel">
            <span className="retention-panel-icon">
              <ClockIcon />
            </span>
            <div>
              <strong>{t('retention.videoWindowTitle')}</strong>
              <p>{t('retention.processingNotice')}</p>
            </div>
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
          {pauseError && (
            <div className="failed-panel" role="alert">
              <div>
                <h3>{t('processing.pauseFailedTitle')}</h3>
                <p>{t('processing.pauseUnconfirmedDescription')}</p>
              </div>
              <ErrorMessage message={pauseError} />
            </div>
          )}
          {resumeError && (
            <div className="failed-panel" role="alert">
              <div>
                <h3>{t('processing.resumeFailedTitle')}</h3>
                <p>{t('processing.resumeUnconfirmedDescription')}</p>
              </div>
              <ErrorMessage message={resumeError} />
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
          {reanalyzeMutation.error && (
            <div className="failed-panel" role="alert">
              <div>
                <h3>{t('processing.startAgainFailedTitle')}</h3>
                <p>{getApiErrorMessage(reanalyzeMutation.error, t)}</p>
              </div>
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
            {canPause && (
              <AppButton
                type="button"
                variant="outline"
                loading={pauseMutation.isPending}
                disabled={pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending}
                onClick={() => {
                  if (pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending) {
                    return
                  }
                  setPauseError(null)
                  setPauseModalOpen(true)
                }}
              >
                {pauseMutation.isPending ? t('processing.pausing') : t('processing.pauseAnalysis')}
              </AppButton>
            )}
            {isPauseRequested && (
              <AppButton type="button" variant="outline" loading disabled>
                {t('processing.pausing')}
              </AppButton>
            )}
            {canResume && (
              <AppButton
                type="button"
                loading={resumeMutation.isPending}
                disabled={resumeMutation.isPending || pauseMutation.isPending || cancelMutation.isPending}
                onClick={() => {
                  if (!canResume || resumeMutation.isPending || pauseMutation.isPending || cancelMutation.isPending) {
                    return
                  }
                  setResumeError(null)
                  resumeMutation.mutate()
                }}
              >
                {resumeMutation.isPending ? t('processing.resuming') : t('processing.resumeAnalysis')}
              </AppButton>
            )}
            {isResumeRequested && (
              <AppButton type="button" loading disabled>
                {t('processing.resuming')}
              </AppButton>
            )}
            {canCancel && (
              <AppButton
                type="button"
                variant="outline"
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending || pauseMutation.isPending || resumeMutation.isPending}
                onClick={() => {
                  if (cancelMutation.isPending || pauseMutation.isPending || resumeMutation.isPending) {
                    return
                  }
                  setCancelError(null)
                  setCancelModalOpen(true)
                }}
              >
                {t('processing.cancelAnalysis')}
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
              <Link className={buttonClassName('primary')} to={`/analysis/${toVideoRouteId(status.videoId)}`}>
                {t('processing.viewResult')}
              </Link>
            )}
            {isCancelled && (
              <AppButton
                type="button"
                onClick={() => {
                  if (reanalyzeMutation.isPending) {
                    return
                  }
                  reanalyzeMutation.mutate()
                }}
                loading={reanalyzeMutation.isPending}
                disabled={reanalyzeMutation.isPending}
                icon={<ActivityIcon />}
              >
                {reanalyzeMutation.isPending ? t('processing.startingAgain') : t('processing.startAgain')}
              </AppButton>
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
          <AppModal
            open={pauseModalOpen}
            title={t('processing.pauseDialogTitle')}
            icon={<AlertCircleIcon />}
            busy={pauseMutation.isPending}
            onClose={() => setPauseModalOpen(false)}
          >
            <p className="app-modal-copy">{t('processing.pauseDialogMessage')}</p>
            {pauseError && <ErrorMessage message={pauseError} />}
            <div className="app-modal-actions">
              <AppButton
                type="button"
                variant="outline"
                disabled={pauseMutation.isPending}
                onClick={() => setPauseModalOpen(false)}
              >
                {t('processing.keepAnalyzing')}
              </AppButton>
              <AppButton
                type="button"
                loading={pauseMutation.isPending}
                disabled={pauseMutation.isPending}
                onClick={() => {
                  if (pauseMutation.isPending) {
                    return
                  }
                  setPauseError(null)
                  pauseMutation.mutate()
                }}
              >
                {pauseMutation.isPending ? t('processing.pausing') : t('processing.pauseAnalysis')}
              </AppButton>
            </div>
          </AppModal>
          <AppModal
            open={cancelModalOpen}
            title={t('processing.cancelDialogTitle')}
            icon={<AlertCircleIcon />}
            busy={cancelMutation.isPending}
            onClose={() => setCancelModalOpen(false)}
          >
            <p className="app-modal-copy">{t('processing.cancelDialogMessage')}</p>
            {cancelError && <ErrorMessage message={cancelError} />}
            <div className="app-modal-actions">
              <AppButton
                type="button"
                variant="outline"
                disabled={cancelMutation.isPending}
                onClick={() => setCancelModalOpen(false)}
              >
                {t('processing.keepAnalyzing')}
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
                onClick={() => {
                  setCancelError(null)
                  cancelMutation.mutate()
                }}
              >
                {cancelMutation.isPending ? t('processing.cancelling') : t('processing.cancelAnalysis')}
              </AppButton>
            </div>
          </AppModal>
        </AppCard>
      )}
    </main>
  )
}

function DetailItem({
  label,
  value,
  icon,
  title,
  truncate = false,
}: {
  label: string
  value: string
  icon: ReactNode
  title?: string
  truncate?: boolean
}) {
  return (
    <div className="detail-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong className={truncate ? 'detail-value-truncate' : undefined} title={title}>{value}</strong>
      </div>
    </div>
  )
}

function ScanStatusPanel({ status, scanType }: { status: JobStatus; scanType: string }) {
  const { t } = useLanguage()
  if (!status.totalSegments) {
    return null
  }

  const completed = status.completedSegments ?? 0
  const total = status.totalSegments
  const statusName = status.status.toLowerCase()
  if (statusName === 'cancelled') {
    return (
      <div className="scan-status-panel scan-status-panel-neutral">
        <div>
          <strong>{t('processing.cancelledPanelTitle')}</strong>
          <span>{t('processing.cancelledSegments', { completed, total })}</span>
        </div>
      </div>
    )
  }

  if (statusName === 'cancelrequested') {
    return (
      <div className="scan-status-panel scan-status-panel-warning">
        <div>
          <strong>{t('processing.cancelRequestedPanelTitle')}</strong>
          <span>{t('processing.cancelRequestedSegments', { completed, total })}</span>
        </div>
      </div>
    )
  }

  if (statusName === 'paused') {
    return (
      <div className="scan-status-panel scan-status-panel-paused">
        <div>
          <strong>{t('processing.pausedPanelTitle')}</strong>
          <span>{t('processing.pausedSegments', { completed, total })}</span>
        </div>
      </div>
    )
  }

  if (statusName === 'pauserequested') {
    return (
      <div className="scan-status-panel scan-status-panel-warning">
        <div>
          <strong>{t('processing.pauseRequestedPanelTitle')}</strong>
          <span>{t('processing.pauseRequestedSegments', { completed, total })}</span>
        </div>
      </div>
    )
  }

  if (statusName === 'resumerequested') {
    return (
      <div className="scan-status-panel scan-status-panel-warning">
        <div>
          <strong>{t('processing.resumeRequestedPanelTitle')}</strong>
          <span>{t('processing.resumeRequestedSegments', { completed, total })}</span>
        </div>
      </div>
    )
  }

  if (statusName === 'completed') {
    return (
      <div className="scan-status-panel scan-status-panel-success">
        <div>
          <strong>{scanType}</strong>
          <span>{t('processing.completedSegments', { completed, total })}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="scan-status-panel scan-status-panel-success">
      <div>
        <strong>{scanType}</strong>
        <span>{t('processing.segmentProgress', { completed, total })}</span>
      </div>
    </div>
  )
}

function getStatusContent(status: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  switch (status?.toLowerCase()) {
    case 'pauserequested':
      return {
        title: t('processing.statusPauseRequestedTitle'),
        description: t('processing.statusPauseRequestedDescription'),
      }
    case 'paused':
      return {
        title: t('processing.statusPausedTitle'),
        description: t('processing.statusPausedDescription'),
      }
    case 'resumerequested':
      return {
        title: t('processing.statusResumeRequestedTitle'),
        description: t('processing.statusResumeRequestedDescription'),
      }
    case 'cancelled':
      return {
        title: t('processing.statusCancelledTitle'),
        description: t('processing.statusCancelledDescription'),
      }
    case 'cancelrequested':
      return {
        title: t('processing.statusCancelRequestedTitle'),
        description: t('processing.statusCancelRequestedDescription'),
      }
    case 'processing':
    case 'preparing':
    case 'finalizing':
    case 'retrying':
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
    case 'preparing':
    case 'finalizing':
    case 'retrying':
    case 'cancelrequested':
      return <ActivityIcon />
    case 'pauserequested':
    case 'resumerequested':
      return <ActivityIcon />
    case 'paused':
      return <ClockIcon />
    case 'completed':
      return <CheckCircleIcon />
    case 'failed':
      return <AlertCircleIcon />
    default:
      return <ClockIcon />
  }
}

function formatLastUpdated(status: JobStatus, language: LanguageCode, t: ReturnType<typeof useLanguage>['t']) {
  const updatedAt = status.lastActivityAt ?? status.lastUpdatedAt ?? status.completedAt
  if (updatedAt) {
    return formatLocalizedDateTime(updatedAt, language, t('processing.notAvailable'))
  }

  const statusName = status.status.toLowerCase()
  return statusName === 'queued'
    || statusName === 'processing'
    || statusName === 'retrying'
    || statusName === 'preparing'
    || statusName === 'pauserequested'
    || statusName === 'resumerequested'
    ? t('processing.polling')
    : t('processing.notAvailable')
}

function formatPercent(value: number | null | undefined, t: ReturnType<typeof useLanguage>['t']) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : t('processing.calculating')
}

function formatSafeStatusText(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  if (!value) {
    return t('processing.waitingWorker')
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'preparing video') {
    return t('processing.stepPreparingVideo')
  }
  if (normalized === 'analysis completed') {
    return t('dynamic.analysisCompleted')
  }
  if (normalized === 'waiting for processing worker') {
    return t('processing.waitingWorker')
  }

  return value
    .replace(/External\s+BitMind\s+verification/gi, t('analysis.externalVerification'))
    .replace(/BitMind/gi, t('analysis.externalVerification'))
}

function formatScanMode(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return t('processing.notAvailable')
  }
  if (normalized === 'basic' || normalized === 'smart' || normalized === 'smart scan') {
    return t('processing.scanTypeSmart')
  }
  if (normalized === 'detailed' || normalized === 'detailed scan') {
    return t('processing.scanTypeDetailed')
  }

  return value!.trim()
}
