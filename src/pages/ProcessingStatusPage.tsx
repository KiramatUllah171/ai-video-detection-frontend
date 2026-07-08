import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient, getApiErrorMessage } from '../api/client'
import type { ApiResponse, JobStatus } from '../api/types'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, FileVideoIcon } from '../components/ui/icons'

export function ProcessingStatusPage() {
  const { videoId } = useParams()
  const statusQuery = useQuery({
    queryKey: ['job-status', videoId],
    enabled: Boolean(videoId),
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<JobStatus>>(`/api/jobs/${videoId}/status`)
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.errors[0] ?? response.data.message)
      }
      return response.data.data
    },
  })

  const status = statusQuery.data
  const message = getStatusMessage(status?.status)
  const statusIcon = getStatusIcon(status?.status)

  return (
    <main className="page">
      <PageHeader
        eyebrow="Analysis queue"
        title="Processing status"
        subtitle="Track the secure analysis job for your uploaded video."
      />

      {statusQuery.isLoading && <LoadingState text="Loading analysis status..." />}
      {statusQuery.error && <ErrorMessage message={getApiErrorMessage(statusQuery.error)} />}
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
          <div className="status-progress-panel">
            <div>
              <span>Analysis progress</span>
              <strong>{status.progress}%</strong>
            </div>
            <ProgressBar value={status.progress} status={status.status} showLabel={false} />
          </div>
          <div className="detail-grid">
            <DetailItem label="Job ID" value={String(status.jobId)} icon={<ActivityIcon />} />
            <DetailItem label="Video ID" value={String(status.videoId)} icon={<FileVideoIcon />} />
            <DetailItem label="Current step" value={status.currentStep ?? 'Waiting for processing worker'} icon={<ClockIcon />} />
            <DetailItem label="Retry count" value={`${status.retryCount} / ${status.maxRetryCount}`} icon={<AlertCircleIcon />} />
            <DetailItem label="Created" value={dayjs(status.createdAt).format('MMM D, YYYY h:mm A')} icon={<ClockIcon />} />
            <DetailItem label="Last updated" value={status.completedAt ? dayjs(status.completedAt).format('MMM D, YYYY h:mm A') : 'Polling every 3 seconds'} icon={<ActivityIcon />} />
          </div>
          {status.status === 'Failed' && (
            <ErrorMessage message={status.errorMessage ?? "We couldn't process this video. Please review the error details or try another file."} />
          )}
          {status.status === 'Completed' && (
            <div className="success-panel">
              <CheckCircleIcon />
              <div>
                <strong>Analysis completed.</strong>
                <span>The report view will be connected when the reporting pipeline is available.</span>
              </div>
            </div>
          )}
          <div className="status-actions">
            <Link className={buttonClassName('outline')} to="/dashboard">
              Back to Dashboard
            </Link>
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

function getStatusMessage(status?: string) {
  switch (status?.toLowerCase()) {
    case 'processing':
      return {
        title: 'Analysis is in progress.',
        description: 'The worker is analyzing the uploaded video and updating this status as it advances.',
      }
    case 'completed':
      return {
        title: 'Analysis completed.',
        description: 'The video finished the current analysis workflow.',
      }
    case 'failed':
      return {
        title: "We couldn't process this video.",
        description: 'Review the error details below or upload another file when ready.',
      }
    default:
      return {
        title: 'Your video is uploaded and queued.',
        description: 'Processing worker will handle analysis in the next pipeline step.',
      }
  }
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
