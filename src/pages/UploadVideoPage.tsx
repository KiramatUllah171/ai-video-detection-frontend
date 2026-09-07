import type { AxiosProgressEvent } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError, apiClient, getApiErrorMessage, getSubscriptionStatus } from '../api/client'
import type { ApiResponse, UploadVideoResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdminRole } from '../auth/roleUtils'
import { SubscriptionStatusPanel } from '../components/subscriptions/SubscriptionStatusPanel'
import { SubscriptionUpgradeModal } from '../components/subscriptions/SubscriptionUpgradeModal'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { AppTextarea, FormField } from '../components/ui/FormField'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { FileVideoIcon, ShieldIcon, UploadIcon, XIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { toVideoRouteId } from '../routes/videoRouteId'
import { getSubscriptionUpgradeErrorCode, shouldShowSubscriptionUpgrade, subscriptionStatusQueryKey } from '../subscriptions/subscriptionErrors'

const absoluteMaxUploadSizeBytes = 314_572_800
const uploadRequestTimeoutMs = 20 * 60 * 1000
const formats = ['MP4', 'MOV', 'AVI', 'MKV', 'WebM']

export function UploadVideoPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const uploadInFlightRef = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [analysisMode, setAnalysisMode] = useState('Basic')
  const [notes, setNotes] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)
  const [subscriptionReasonCode, setSubscriptionReasonCode] = useState<string | undefined>()
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false)
  const isAdmin = isAdminRole(auth.user?.role)
  const subscriptionStatusQuery = useQuery({
    queryKey: subscriptionStatusQueryKey,
    queryFn: getSubscriptionStatus,
    enabled: auth.isAuthenticated,
    staleTime: 30_000,
  })
  const freeTrialUsedUp = isFreeTrialUsedUp(subscriptionStatusQuery.data)
  const uploadDropzoneDisabled = isStartingAnalysis || freeTrialUsedUp
  const selectedMaxUploadSizeBytes = absoluteMaxUploadSizeBytes
  const selectedMaxSizeLabel = getMaxSizeLabel(analysisMode, t)
  const fileExceedsSelectedModeLimit = Boolean(file && file.size > selectedMaxUploadSizeBytes)

  useEffect(() => {
    if (!freeTrialUsedUp) {
      return
    }

    setFile(null)
    setProgress(0)
    setIsDragging(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [freeTrialUsedUp])

  function selectFile(nextFile?: File) {
    if (uploadDropzoneDisabled) {
      return
    }

    if (nextFile) {
      const preflight = validateFileSizePreflight(nextFile.size, subscriptionStatusQuery.data, isAdmin)
      if (preflight === 'absolute') {
        setFile(null)
        setError(t('upload.absoluteMaxSizeError'))
        setProgress(0)
        return
      }
      if (preflight === 'plan') {
        setFile(null)
        setSubscriptionReasonCode('VIDEO_SIZE_LIMIT_EXCEEDED')
        setSubscriptionModalOpen(true)
        setError(t('subscriptions.videoTooLargeForPlan'))
        setProgress(0)
        return
      }

      setFile(nextFile)
      setError(null)
      setProgress(0)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  function removeFile() {
    if (isStartingAnalysis) {
      return
    }

    setFile(null)
    setProgress(0)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function handleAnalysisModeChange(nextMode: string) {
    if (isStartingAnalysis) {
      return
    }

    setAnalysisMode(nextMode)
    setFile(null)
    setError(null)
    setProgress(0)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  async function handleUpload() {
    if (uploadInFlightRef.current) {
      return
    }

    if (!file || !consentAccepted || !auth.isAuthenticated || uploadDropzoneDisabled) {
      return
    }

    const preflight = validateFileSizePreflight(file.size, subscriptionStatusQuery.data, isAdmin)
    if (preflight === 'absolute') {
      setError(t('upload.absoluteMaxSizeError'))
      setProgress(0)
      return
    }
    if (preflight === 'plan') {
      setSubscriptionReasonCode('VIDEO_SIZE_LIMIT_EXCEEDED')
      setSubscriptionModalOpen(true)
      setError(t('subscriptions.videoTooLargeForPlan'))
      setProgress(0)
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('consentAccepted', String(consentAccepted))
    formData.append('analysisMode', analysisMode)
    if (notes.trim()) {
      formData.append('notes', notes.trim())
    }

    setIsStartingAnalysis(true)
    uploadInFlightRef.current = true
    setError(null)
    try {
      const response = await apiClient.post<ApiResponse<UploadVideoResponse>>('/api/videos/upload', formData, {
        timeout: uploadRequestTimeoutMs,
        onUploadProgress(event: AxiosProgressEvent) {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100))
          }
        },
      })

      if (!response.data.success || !response.data.data) {
        throw new ApiRequestError(response.data.errors[0] ?? response.data.message, {
          correlationId: response.data.correlationId,
          errorCode: response.data.errorCode,
          status: response.status,
        })
      }

      navigate(`/processing/${toVideoRouteId(response.data.data.videoId)}`, {
        state: { jobId: response.data.data.jobId },
      })
    } catch (requestError) {
      if (shouldShowSubscriptionUpgrade(requestError, isAdmin)) {
        setSubscriptionReasonCode(getSubscriptionUpgradeErrorCode(requestError))
        setSubscriptionModalOpen(true)
        setError(null)
      } else {
        setError(getApiErrorMessage(requestError, t))
      }
      setIsStartingAnalysis(false)
      uploadInFlightRef.current = false
    }
  }

  return (
    <main className="page">
      <PageHeader
        eyebrow={t('upload.eyebrow')}
        title={t('upload.title')}
        subtitle={t('upload.subtitle')}
      />
      <div className="content-grid">
        <AppCard className="span-8 upload-card">
          {error && <ErrorMessage message={error} />}
          <div
            className={`upload-dropzone ${isDragging ? 'active' : ''} ${freeTrialUsedUp ? 'exhausted' : ''}`}
            role={freeTrialUsedUp ? undefined : 'button'}
            tabIndex={freeTrialUsedUp ? -1 : 0}
            aria-disabled={freeTrialUsedUp ? undefined : isStartingAnalysis}
            onDragOver={(event) => {
              event.preventDefault()
              if (uploadDropzoneDisabled) {
                return
              }
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              if (uploadDropzoneDisabled) {
                return
              }
              selectFile(event.dataTransfer.files[0])
            }}
            onKeyDown={(event) => {
              if (uploadDropzoneDisabled) {
                return
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
          >
            {freeTrialUsedUp ? (
              <>
                <span className="upload-icon upload-icon-danger">
                  <ShieldIcon />
                </span>
                <h2>{t('upload.freeTrialExhaustedTitle')}</h2>
                <p>{t('upload.freeTrialExhaustedDescription')}</p>
                <AppButton
                  type="button"
                  onClick={() => {
                    setSubscriptionReasonCode('FREE_TRIAL_EXHAUSTED')
                    setSubscriptionModalOpen(true)
                  }}
                >
                  {t('subscriptions.upgradePlan')}
                </AppButton>
              </>
            ) : (
              <>
                <span className="upload-icon">
                  <UploadIcon />
                </span>
                <h2>
                  <span className="desktop-upload-title">{t('upload.dropTitle')}</span>
                  <span className="mobile-upload-title">{t('upload.browse')}</span>
                </h2>
                <p>{t('upload.dropSubtitle')}</p>
                <AppButton
                  type="button"
                  variant="outline"
                  disabled={isStartingAnalysis}
                  onClick={() => {
                    if (!isStartingAnalysis) {
                      inputRef.current?.click()
                    }
                  }}
                >
                  {t('upload.browse')}
                </AppButton>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
              hidden
              disabled={uploadDropzoneDisabled}
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            {!freeTrialUsedUp && (
              <>
                <div className="format-chips" aria-label={t('upload.supportedFormats')}>
                  {formats.map((format) => (
                    <span key={format}>{format}</span>
                  ))}
                </div>
                <span className="upload-limit">{t('upload.maxSize', { size: selectedMaxSizeLabel })}</span>
              </>
            )}
          </div>
          {file && (
            <div className="selected-file">
              <div className="file-icon large">
                <FileVideoIcon />
              </div>
              <div>
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>{file.type || t('upload.unknownType')} | {file.name.split('.').pop()?.toUpperCase()}</span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={removeFile}
                disabled={isStartingAnalysis}
                aria-disabled={isStartingAnalysis}
                aria-label={isStartingAnalysis ? t('upload.removeFileDisabled') : t('upload.removeFile')}
              >
                <XIcon />
              </button>
            </div>
          )}
        </AppCard>

        <AppCard className="span-4 options-card">
          <div className="card-header compact">
            <div>
              <h2>{t('upload.options')}</h2>
              <p>{t('upload.optionsSubtitle')}</p>
            </div>
          </div>
          {auth.isAuthenticated && (
            <SubscriptionStatusPanel
              onUpgradeClick={() => {
                setSubscriptionReasonCode(undefined)
                setSubscriptionModalOpen(true)
              }}
            />
          )}
          <div className="mode-grid">
            {[
              ['Basic', t('upload.smartScan'), t('upload.smartScanDescription')],
              ['Detailed', t('upload.detailed'), t('upload.detailedDescription')],
            ].map(([mode, label, description]) => (
              <label className={`mode-card ${analysisMode === mode ? 'selected' : ''}`} key={mode}>
                <input
                  type="radio"
                  name="analysisMode"
                  value={mode}
                  checked={analysisMode === mode}
                  onChange={(event) => handleAnalysisModeChange(event.target.value)}
                />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <p className="form-helper">
            {t('upload.scanModeNotice')}
          </p>
          {file && file.size > 50 * 1024 * 1024 && (
            <div className="success-panel">
              <div>
                <strong>{t('upload.longVideoTitle')}</strong>
                <span>{t('upload.longVideoDescription')}</span>
              </div>
            </div>
          )}
          <FormField label={t('upload.notes')} helper={t('upload.notesHelper')}>
            <AppTextarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>
          <label className="consent-card">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(event) => setConsentAccepted(event.target.checked)}
            />
            <span>
              <ShieldIcon />
            </span>
            <strong>{t('upload.consent')}</strong>
          </label>
          {isStartingAnalysis && (
            <div className="upload-progress">
              <div>
                <strong>{t('upload.uploading')}</strong>
                <span>{t('upload.complete', { progress })}</span>
              </div>
              <ProgressBar value={progress} showLabel={false} />
            </div>
          )}
          <AppButton
            type="button"
            fullWidth
            loading={isStartingAnalysis}
            disabled={!file || !consentAccepted || !auth.isAuthenticated || uploadDropzoneDisabled || fileExceedsSelectedModeLimit}
            onClick={handleUpload}
            icon={<UploadIcon />}
          >
            {isStartingAnalysis ? t('upload.startingAnalysis') : t('dashboard.startAnalysis')}
          </AppButton>
        </AppCard>
      </div>
      <SubscriptionUpgradeModal
        open={subscriptionModalOpen}
        reasonCode={subscriptionReasonCode}
        onClose={() => setSubscriptionModalOpen(false)}
      />
    </main>
  )
}

function getMaxSizeLabel(analysisMode: string, t: ReturnType<typeof useLanguage>['t']) {
  return analysisMode === 'Detailed' ? t('upload.detailedScanMaxSizeLabel') : t('upload.smartScanMaxSizeLabel')
}

function isFreeTrialUsedUp(
  status: { isAdmin: boolean; isPaid: boolean; planCode: string; remainingScans?: number | null; freeTrial?: { effectiveRemainingScans: number } | null } | undefined,
) {
  if (!status || status.isAdmin || status.isPaid || status.planCode.toUpperCase() !== 'FREE') {
    return false
  }

  return (status.freeTrial?.effectiveRemainingScans ?? status.remainingScans ?? 0) <= 0
}

function validateFileSizePreflight(
  fileSize: number,
  status: { isAdmin: boolean; maxVideoSizeBytes?: number | null } | undefined,
  isAdmin: boolean,
) {
  if (fileSize > absoluteMaxUploadSizeBytes) {
    return 'absolute'
  }

  if (isAdmin || status?.isAdmin) {
    return null
  }

  const planMax = status?.maxVideoSizeBytes
  if (planMax && fileSize > Math.min(planMax, absoluteMaxUploadSizeBytes)) {
    return 'plan'
  }

  return null
}
