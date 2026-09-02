import type { AxiosProgressEvent } from 'axios'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError, apiClient, getApiErrorMessage } from '../api/client'
import type { ApiResponse, UploadVideoResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { AppTextarea, FormField } from '../components/ui/FormField'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { ClockIcon, FileVideoIcon, ShieldIcon, UploadIcon, XIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { toVideoRouteId } from '../routes/videoRouteId'

type Translate = (key: string, values?: Record<string, string | number>) => string

const smartScanMaxSizeLabel = '200 MB'
const detailedScanMaxSizeLabel = '500 MB'
const smartScanMaxUploadSizeBytes = 209_715_200
const detailedScanMaxUploadSizeBytes = 524_288_000
const formats = ['MP4', 'MOV', 'AVI', 'MKV', 'WebM']

export function UploadVideoPage() {
  const auth = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [analysisMode, setAnalysisMode] = useState('Basic')
  const [notes, setNotes] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false)
  const selectedMaxUploadSizeBytes = getMaxUploadSizeBytes(analysisMode)
  const selectedMaxSizeLabel = getMaxSizeLabel(analysisMode)
  const selectedScanLabel = analysisMode === 'Detailed' ? t('processing.scanTypeDetailed') : t('processing.scanTypeSmart')
  const fileExceedsSelectedModeLimit = Boolean(file && file.size > selectedMaxUploadSizeBytes)

  function selectFile(nextFile?: File) {
    if (isStartingAnalysis) {
      return
    }

    if (nextFile) {
      if (nextFile.size > selectedMaxUploadSizeBytes) {
        setFile(null)
        setError(getFileSizeError(selectedScanLabel, selectedMaxSizeLabel, t))
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
    if (!file || !consentAccepted || !auth.isAuthenticated || isStartingAnalysis) {
      return
    }

    if (file.size > selectedMaxUploadSizeBytes) {
      setError(getFileSizeError(selectedScanLabel, selectedMaxSizeLabel, t))
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
    setError(null)
    try {
      const response = await apiClient.post<ApiResponse<UploadVideoResponse>>('/api/videos/upload', formData, {
        timeout: 10 * 60 * 1000,
        onUploadProgress(event: AxiosProgressEvent) {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100))
          }
        },
      })

      if (!response.data.success || !response.data.data) {
        throw new ApiRequestError(response.data.errors[0] ?? response.data.message, {
          correlationId: response.data.correlationId,
          status: response.status,
        })
      }

      navigate(`/processing/${toVideoRouteId(response.data.data.videoId)}`, {
        state: { jobId: response.data.data.jobId },
      })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t))
      setIsStartingAnalysis(false)
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
            className={`upload-dropzone ${isDragging ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-disabled={isStartingAnalysis}
            onDragOver={(event) => {
              event.preventDefault()
              if (isStartingAnalysis) {
                return
              }
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              if (isStartingAnalysis) {
                return
              }
              selectFile(event.dataTransfer.files[0])
            }}
            onKeyDown={(event) => {
              if (isStartingAnalysis) {
                return
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
          >
            <span className="upload-icon">
              <UploadIcon />
            </span>
            <h2>{t('upload.dropTitle')}</h2>
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
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
              hidden
              disabled={isStartingAnalysis}
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            <div className="format-chips" aria-label={t('upload.supportedFormats')}>
              {formats.map((format) => (
                <span key={format}>{format}</span>
              ))}
            </div>
            <span className="upload-limit">{t('upload.maxSize', { size: selectedMaxSizeLabel })}</span>
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
          <div className="retention-panel retention-panel-compact">
            <span className="retention-panel-icon">
              <ClockIcon />
            </span>
            <div>
              <strong>{t('retention.videoWindowTitle')}</strong>
              <p>{t('retention.uploadNotice')}</p>
            </div>
          </div>
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
            disabled={!file || !consentAccepted || !auth.isAuthenticated || isStartingAnalysis || fileExceedsSelectedModeLimit}
            onClick={handleUpload}
            icon={<UploadIcon />}
          >
            {isStartingAnalysis ? t('upload.startingAnalysis') : t('dashboard.startAnalysis')}
          </AppButton>
        </AppCard>
      </div>
    </main>
  )
}

function getMaxUploadSizeBytes(analysisMode: string) {
  return analysisMode === 'Detailed' ? detailedScanMaxUploadSizeBytes : smartScanMaxUploadSizeBytes
}

function getMaxSizeLabel(analysisMode: string) {
  return analysisMode === 'Detailed' ? detailedScanMaxSizeLabel : smartScanMaxSizeLabel
}

function getFileSizeError(scanLabel: string, maxSizeLabel: string, t: Translate) {
  return t('upload.maxSizeError', { scan: scanLabel, size: maxSizeLabel })
}
