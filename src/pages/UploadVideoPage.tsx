import type { AxiosProgressEvent } from 'axios'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, getApiErrorMessage } from '../api/client'
import type { ApiResponse, UploadVideoResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { AppTextarea, FormField } from '../components/ui/FormField'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { FileVideoIcon, ShieldIcon, UploadIcon, XIcon } from '../components/ui/icons'

const maxSizeLabel = '500 MB'
const formats = ['MP4', 'MOV', 'AVI', 'MKV', 'WebM']

export function UploadVideoPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [analysisMode, setAnalysisMode] = useState('Basic')
  const [notes, setNotes] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function selectFile(nextFile?: File) {
    if (nextFile) {
      setFile(nextFile)
      setError(null)
      setProgress(0)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  function removeFile() {
    setFile(null)
    setProgress(0)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  async function handleUpload() {
    if (!file || !consentAccepted || !auth.isAuthenticated) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('consentAccepted', String(consentAccepted))
    formData.append('analysisMode', analysisMode)
    if (notes.trim()) {
      formData.append('notes', notes.trim())
    }

    setUploading(true)
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
        throw new Error(response.data.errors[0] ?? response.data.message)
      }

      navigate(`/processing/${response.data.data.videoId}`, {
        state: { jobId: response.data.data.jobId },
      })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="page">
      <PageHeader
        eyebrow="Secure upload"
        title="Upload video for analysis"
        subtitle="Submit a video to begin secure AI-assisted authenticity and origin analysis."
      />
      <div className="content-grid">
        <AppCard className="span-8 upload-card">
          {error && <ErrorMessage message={error} />}
          <div
            className={`upload-dropzone ${isDragging ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              selectFile(event.dataTransfer.files[0])
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
          >
            <span className="upload-icon">
              <UploadIcon />
            </span>
            <h2>Drag and drop your video here</h2>
            <p>or browse from your device</p>
            <AppButton type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Browse files
            </AppButton>
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
              hidden
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            <div className="format-chips" aria-label="Supported video formats">
              {formats.map((format) => (
                <span key={format}>{format}</span>
              ))}
            </div>
            <span className="upload-limit">Maximum file size: {maxSizeLabel}</span>
          </div>
          {file && (
            <div className="selected-file">
              <div className="file-icon large">
                <FileVideoIcon />
              </div>
              <div>
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>{file.type || 'Unknown content type'} | {file.name.split('.').pop()?.toUpperCase()}</span>
              </div>
              <button type="button" className="icon-button" onClick={removeFile} aria-label="Remove selected file">
                <XIcon />
              </button>
            </div>
          )}
        </AppCard>

        <AppCard className="span-4 options-card">
          <div className="card-header compact">
            <div>
              <h2>Analysis options</h2>
              <p>Choose the workflow depth for this upload.</p>
            </div>
          </div>
          <div className="mode-grid">
            {[
              ['Basic', 'Fast standard authenticity workflow'],
              ['Detailed', 'Deeper analysis mode for future advanced pipeline'],
            ].map(([mode, description]) => (
              <label className={`mode-card ${analysisMode === mode ? 'selected' : ''}`} key={mode}>
                <input
                  type="radio"
                  name="analysisMode"
                  value={mode}
                  checked={analysisMode === mode}
                  onChange={(event) => setAnalysisMode(event.target.value)}
                />
                <strong>{mode}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
          <FormField label="Notes" helper="Optional context for your team.">
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
            <strong>I confirm I have the right to upload this video for analysis.</strong>
          </label>
          {uploading && (
            <div className="upload-progress">
              <div>
                <strong>Uploading securely</strong>
                <span>{progress}% complete</span>
              </div>
              <ProgressBar value={progress} showLabel={false} />
            </div>
          )}
          <AppButton
            type="button"
            fullWidth
            loading={uploading}
            disabled={!file || !consentAccepted || !auth.isAuthenticated}
            onClick={handleUpload}
            icon={<UploadIcon />}
          >
            Start Analysis
          </AppButton>
        </AppCard>
      </div>
    </main>
  )
}
