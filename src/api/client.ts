import axios, { AxiosError } from 'axios'
import type {
  AdminDashboardSummary,
  AdminAuditLog,
  AdminJobListItem,
  AdminProviderRequestListItem,
  AdminProviderRequestUserSummary,
  AdminUserListItem,
  AdminVideoDetail,
  AdminVideoListItem,
  AnalysisResult,
  ApiResponse,
  AuthResponse,
  JobStatus,
  MetadataResult,
  PagedResponse,
  SourceMatch,
  UploadVideoResponse,
} from './types'
import { authStorage } from '../auth/authStorage'
import { isStrongPasswordErrorMessage } from '../auth/passwordPolicy'

const env = import.meta.env as Record<string, string | undefined>
const baseURL =
  env.VITE_API_BASE_URL ??
  env.REACT_APP_API_BASE_URL ??
  'http://localhost:5166'

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const selectedLanguage = localStorage.getItem('ai-video-detection-language')
  if (selectedLanguage) {
    config.headers = config.headers ?? {}
    config.headers['Accept-Language'] = selectedLanguage
  }

  if (authStorage.isSessionExpired()) {
    authStorage.clear()
    return config
  }

  const token = authStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && originalRequest && !originalRequest.headers?.['x-refresh-attempted']) {
      if (authStorage.isSessionExpired()) {
        authStorage.clear()
        return Promise.reject(error)
      }

      try {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers['x-refresh-attempted'] = 'true'
        const refreshResponse = await axios.post<ApiResponse<AuthResponse>>(
          `${baseURL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        )

        if (refreshResponse.data.success && refreshResponse.data.data) {
          authStorage.setSession(refreshResponse.data.data)
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.accessToken}`
          return apiClient(originalRequest)
        }
      } catch {
        authStorage.clear()
      }
    }

    return Promise.reject(error)
  },
)

type Translate = (key: string, values?: Record<string, string | number>) => string
const REPORT_EXPIRED_ERROR_CODE = 'REPORT_EXPIRED'

export class ApiRequestError extends Error {
  correlationId?: string
  status?: number

  constructor(message: string, options?: { correlationId?: string; status?: number }) {
    super(message)
    this.name = 'ApiRequestError'
    this.correlationId = options?.correlationId
    this.status = options?.status
  }
}

export function getApiErrorMessage(error: unknown, t?: Translate) {
  if (error instanceof ApiRequestError) {
    return appendCorrelationId(localizeApiError(error.message, t, error.status), error.correlationId, t)
  }

  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.code === 'ERR_NETWORK') {
      return t ? t('api.networkError') : 'Network error while contacting the API. For large uploads, confirm the backend is running and allows the selected file size.'
    }

    if (error.code === 'ECONNABORTED') {
      return t ? t('api.timeoutError') : 'The request timed out. Please try again or use a smaller file.'
    }

    const response = error.response?.data
    const message = localizeApiError(response?.errors?.[0] ?? response?.message ?? error.message, t, error.response?.status)
    return appendCorrelationId(message, response?.correlationId, t)
  }

  return localizeApiError(error instanceof Error ? error.message : t ? t('api.requestFailed') : 'Request failed.', t)
}

function appendCorrelationId(message: string, correlationId: string | undefined, t?: Translate) {
  if (!correlationId) {
    return message
  }

  const reference = t ? t('api.correlationReference', { correlationId }) : `Reference ID: ${correlationId}`
  return `${message} ${reference}`
}

function localizeApiError(message: string, t?: Translate, status?: number) {
  if (!t) {
    return message
  }

  const normalized = message.trim().toLowerCase()
  if (normalized === REPORT_EXPIRED_ERROR_CODE.toLowerCase()) {
    return t('retention.reportExpiredError')
  }
  if (normalized.includes('email is already registered') || normalized.includes('email address is already registered')) {
    return t('signup.emailAlreadyRegistered')
  }
  if (isStrongPasswordErrorMessage(normalized)) {
    return t('signup.strongPasswordRequirement')
  }
  if (
    normalized.includes('too many requests') ||
    normalized.includes('too many failed sign-in attempts') ||
    status === 429
  ) {
    return t('api.tooManyRequests')
  }
  if (status === 401 || normalized.includes('unauthorized') || normalized.includes('invalid refresh token')) {
    return t('api.unauthorized')
  }
  if (status === 403 || normalized.includes('forbidden') || normalized.includes('not authorized')) {
    return t('api.forbidden')
  }
  if (normalized.includes('report retention period has ended') || normalized.includes('report is no longer available')) {
    return t('retention.reportExpiredError')
  }
  if (
    normalized.includes('original video file is no longer available') ||
    normalized.includes('video availability period has ended')
  ) {
    return t('retention.videoExpiredError')
  }
  if (normalized.includes('confirm your email address') || normalized.includes('email address has not been confirmed')) {
    return t('login.emailNotConfirmed')
  }
  if (normalized.includes('user account is inactive')) {
    return t('api.accountInactive')
  }
  if (
    normalized.includes('not found') ||
    normalized.includes('not available yet') ||
    normalized.includes('were not found') ||
    normalized.includes('was not found')
  ) {
    return t('analysis.notAvailable')
  }
  if (
    normalized.includes('only failed') ||
    normalized.includes('maximum retry') ||
    normalized.includes('no failed analysis job') ||
    normalized.includes('cannot be paused') ||
    normalized.includes('cannot be resumed') ||
    normalized.includes('analysis was cancelled') ||
    normalized.includes('analysis has already completed')
  ) {
    return t('processing.defaultError')
  }
  if (
    normalized.includes('video file is required') ||
    normalized.includes('uploaded file is empty') ||
    normalized.includes('file extension is not supported') ||
    normalized.includes('filename is invalid') ||
    normalized.includes('content type is not supported') ||
    normalized.includes('right to upload')
  ) {
    return t('api.validationError')
  }
  if (
    status !== undefined && status >= 500 ||
    normalized.includes('request failed') ||
    normalized.includes('server error') ||
    normalized.includes('unexpected error')
  ) {
    return t('api.serverError')
  }
  return t('api.requestFailed')
}

function createApiRequestError<T>(response: ApiResponse<T>, status?: number) {
  return new ApiRequestError(response.errors?.[0] ?? response.message ?? 'Request failed.', {
    correlationId: response.correlationId,
    status,
  })
}

export async function getAnalysisResult(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<AnalysisResult>>(`/api/videos/${videoId}/analysis`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function retryAnalysis(videoId: string | number) {
  const response = await apiClient.post<ApiResponse<UploadVideoResponse>>(`/api/videos/${videoId}/retry-analysis`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function reanalyzeVideo(videoId: string | number) {
  const response = await apiClient.post<ApiResponse<UploadVideoResponse>>(`/api/videos/${videoId}/reanalyze`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function cancelAnalysis(videoId: string | number) {
  const response = await apiClient.post<ApiResponse<JobStatus>>(`/api/videos/${videoId}/cancel-analysis`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function pauseAnalysis(videoId: string | number) {
  const response = await apiClient.post<ApiResponse<JobStatus>>(`/api/videos/${videoId}/pause-analysis`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function resumeAnalysis(videoId: string | number) {
  const response = await apiClient.post<ApiResponse<JobStatus>>(`/api/videos/${videoId}/resume-analysis`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function getOriginMatches(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<SourceMatch[]>>(`/api/videos/${videoId}/origin-matches`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function getVideoMetadata(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<MetadataResult>>(`/api/videos/${videoId}/metadata`)
  if (!response.data.success || !response.data.data) {
    return undefined
  }
  return response.data.data
}

export async function downloadAnalysisReport(videoId: string | number) {
  const response = await apiClient.get<Blob>(`/api/videos/${videoId}/report/pdf`, {
    responseType: 'blob',
  }).catch(async (error: unknown) => {
    throw await getBlobApiError(error)
  })

  return {
    blob: new Blob([response.data], { type: 'application/pdf' }),
    fileName: getDownloadFileName(response.headers['content-disposition']),
  }
}

async function getBlobApiError(error: unknown) {
  if (!axios.isAxiosError<ApiResponse<unknown> | Blob>(error)) {
    return error instanceof Error ? error : new ApiRequestError('Request failed.')
  }

  const data = error.response?.data
  if (data && typeof data === 'object' && 'success' in data) {
    const message = data.errors?.[0] ?? data.message ?? error.message
    const normalizedMessage = getReportDownloadErrorMessage(error.response?.status, message) ?? message
    return new ApiRequestError(normalizedMessage, {
      correlationId: data.correlationId,
      status: error.response?.status,
    })
  }

  if (!data || typeof (data as Blob).text !== 'function') {
    return new ApiRequestError(getReportDownloadErrorMessage(error.response?.status, error.message) ?? error.message, {
      status: error.response?.status,
    })
  }

  const text = await (data as Blob).text()
  if (!text.trim()) {
    return new ApiRequestError(getReportDownloadErrorMessage(error.response?.status, error.message) ?? error.message, {
      status: error.response?.status,
    })
  }

  try {
    const response = JSON.parse(text) as ApiResponse<unknown>
    const message = response.errors?.[0] ?? response.message ?? error.message
    const normalizedMessage = getReportDownloadErrorMessage(error.response?.status, message) ?? message
    return new ApiRequestError(normalizedMessage, {
      correlationId: response.correlationId,
      status: error.response?.status,
    })
  } catch {
    return new ApiRequestError(getReportDownloadErrorMessage(error.response?.status, text) ?? text, {
      status: error.response?.status,
    })
  }
}

function getReportDownloadErrorMessage(status: number | undefined, message: string) {
  const normalized = message.trim().toLowerCase()
  if (
    normalized.includes('analysis report is not available yet') ||
    normalized.includes('report is not available yet') ||
    normalized.includes('video was not found')
  ) {
    return undefined
  }

  if (
    status === 406 ||
    status === 410 ||
    normalized === REPORT_EXPIRED_ERROR_CODE.toLowerCase() ||
    normalized.includes('report retention period has ended') ||
    normalized.includes('report availability period has ended') ||
    normalized.includes('report is no longer available') ||
    (status === 404 && (
      normalized.includes('request failed') ||
      normalized.includes("couldn't complete the analysis") ||
      normalized.includes('could not complete the analysis')
    ))
  ) {
    return REPORT_EXPIRED_ERROR_CODE
  }

  return undefined
}

function getDownloadFileName(contentDisposition?: string) {
  if (!contentDisposition) {
    return 'ai-video-detection-report.pdf'
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim())
  }

  const filenameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return filenameMatch?.[1]?.trim() || 'ai-video-detection-report.pdf'
}

export async function requestPasswordReset(email: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/forgot-password', { email })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function resetPassword(token: string, password: string, confirmPassword: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/reset-password', {
    token,
    password,
    confirmPassword,
  })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function checkPasswordReset(token: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/check-password-reset', { token })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function confirmEmail(token: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/confirm-email', { token })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function checkEmailConfirmation(token: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/check-email-confirmation', { token })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function declineEmailConfirmation(token: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/decline-email-confirmation', { token })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function resendEmailConfirmation(email: string) {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/resend-confirmation-email', { email })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data
}

export async function getAdminDashboardSummary() {
  const response = await apiClient.get<ApiResponse<AdminDashboardSummary>>('/api/admin/dashboard/summary')
  return unwrapApiResponse(response.data)
}

export async function getAdminUsers(params: { page?: number; pageSize?: number; search?: string; status?: string }) {
  const response = await apiClient.get<ApiResponse<PagedResponse<AdminUserListItem>>>('/api/admin/users', { params })
  return unwrapApiResponse(response.data)
}

export async function updateAdminUserStatus(userId: string | number, isActive: boolean) {
  const response = await apiClient.patch<ApiResponse<AdminUserListItem>>(`/api/admin/users/${userId}/status`, { isActive })
  return unwrapApiResponse(response.data)
}

export async function getAdminVideos(params: { page?: number; pageSize?: number; search?: string; status?: string }) {
  const response = await apiClient.get<ApiResponse<PagedResponse<AdminVideoListItem>>>('/api/admin/videos', { params })
  return unwrapApiResponse(response.data)
}

export async function getAdminVideoDetail(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<AdminVideoDetail>>(`/api/admin/videos/${videoId}`)
  return unwrapApiResponse(response.data)
}

export async function getAdminVideoFile(videoId: string | number) {
  const response = await apiClient.get<Blob>(`/api/admin/videos/${videoId}/file`, {
    responseType: 'blob',
  })
  return response.data
}

export async function getAdminJobs(params: { page?: number; pageSize?: number; status?: string }) {
  const response = await apiClient.get<ApiResponse<PagedResponse<AdminJobListItem>>>('/api/admin/jobs', { params })
  return unwrapApiResponse(response.data)
}

export async function getAdminProviderRequests(params: { page?: number; pageSize?: number; status?: string; userId?: number }) {
  const response = await apiClient.get<ApiResponse<PagedResponse<AdminProviderRequestListItem>>>('/api/admin/provider-requests', { params })
  return unwrapApiResponse(response.data)
}

export async function getAdminProviderRequestUsers(params: { page?: number; pageSize?: number; search?: string }) {
  const response = await apiClient.get<ApiResponse<PagedResponse<AdminProviderRequestUserSummary>>>('/api/admin/provider-request-users', { params })
  return unwrapApiResponse(response.data)
}

export async function getAdminAuditLogs(params: {
  page?: number
  pageSize?: number
  search?: string
  from?: string
  to?: string
  severity?: string
  category?: string
}) {
  const response = await apiClient.get<ApiResponse<PagedResponse<AdminAuditLog>>>('/api/admin/logs', { params })
  return unwrapApiResponse(response.data)
}

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (!response.success || response.data === undefined) {
    throw createApiRequestError(response)
  }

  return response.data
}
