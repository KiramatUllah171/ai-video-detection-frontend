import axios, { AxiosError } from 'axios'
import type {
  AdminAssignUserRequestsRequest,
  AdminDashboardSummary,
  AdminAuditLog,
  AdminJobListItem,
  AdminManualSubscriptionGrant,
  AdminProviderRequestListItem,
  AdminProviderRequestUserSummary,
  AdminUserListItem,
  AdminVideoDetail,
  AdminVideoListItem,
  AnalysisResult,
  ApiResponse,
  AuthResponse,
  GuestUploadStatusResponse,
  JobStatus,
  MockPaymentCompletionRequest,
  MetadataResult,
  PagedResponse,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  SourceMatch,
  SubscriptionStatusResponse,
  UploadVideoResponse,
} from './types'
import { authStorage } from '../auth/authStorage'
import { isStrongPasswordErrorMessage } from '../auth/passwordPolicy'

const env = import.meta.env as ImportMetaEnv & {
  VITE_API_BASE_URL?: string
  REACT_APP_API_BASE_URL?: string
}
const configuredBaseURL = env.VITE_API_BASE_URL ?? env.REACT_APP_API_BASE_URL
const baseURL = resolveApiBaseURL(configuredBaseURL)

function resolveApiBaseURL(configuredValue?: string) {
  const configured = configuredValue?.trim()
  if (env.PROD) {
    return resolveProductionApiBaseURL(configured)
  }

  if (shouldUseBrowserHostApiBaseURL(configured)) {
    return `http://${window.location.hostname}:5166`
  }

  return configured || 'http://localhost:5166'
}

function resolveProductionApiBaseURL(configured?: string) {
  if (!configured) {
    throw new Error('VITE_API_BASE_URL must be configured for production builds.')
  }

  let configuredUrl: URL
  try {
    configuredUrl = new URL(configured)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTPS URL in production builds.')
  }

  if (configuredUrl.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use HTTPS in production builds.')
  }

  return configured.replace(/\/+$/, '')
}

function shouldUseBrowserHostApiBaseURL(configured?: string) {
  if (typeof window === 'undefined' || !env.DEV || !isLocalDevelopmentHost(window.location.hostname)) {
    return false
  }

  if (!configured) {
    return true
  }

  try {
    const configuredUrl = new URL(configured)
    return configuredUrl.port === '5166' && isLocalDevelopmentHost(configuredUrl.hostname)
  } catch {
    return false
  }
}

function isLocalDevelopmentHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase()
  if (normalized === 'localhost' || normalized === '127.0.0.1') {
    return true
  }

  const parts = normalized.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168)
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})

let refreshSessionPromise: Promise<AuthResponse | null> | null = null

export function refreshAuthSession() {
  refreshSessionPromise ??= axios
    .post<ApiResponse<AuthResponse>>(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true })
    .then((response) => {
      if (response.data.success && response.data.data) {
        authStorage.setSession(response.data.data)
        return response.data.data
      }

      authStorage.clear()
      return null
    })
    .catch((error: unknown) => {
      authStorage.clear()
      throw error
    })
    .finally(() => {
      refreshSessionPromise = null
    })

  return refreshSessionPromise
}

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}

  const selectedLanguage = localStorage.getItem('ai-video-detection-language')
  if (selectedLanguage) {
    config.headers['Accept-Language'] = selectedLanguage
    config.headers['X-Language'] = selectedLanguage
  }

  const deviceFingerprint = getDeviceFingerprint()
  if (deviceFingerprint) {
    config.headers['X-SachAI-Device-Fingerprint'] = deviceFingerprint
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
        const refreshedSession = await refreshAuthSession()

        if (refreshedSession) {
          originalRequest.headers.Authorization = `Bearer ${refreshedSession.accessToken}`
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
  errorCode?: string
  status?: number

  constructor(message: string, options?: { correlationId?: string; errorCode?: string; status?: number }) {
    super(message)
    this.name = 'ApiRequestError'
    this.correlationId = options?.correlationId
    this.errorCode = options?.errorCode
    this.status = options?.status
  }
}

export function getApiErrorMessage(error: unknown, t?: Translate) {
  if (error instanceof ApiRequestError) {
    const codedMessage = localizeApiErrorCode(error.errorCode, t)
    if (codedMessage) {
      return appendCorrelationId(codedMessage, error.correlationId, t)
    }

    return appendCorrelationId(localizeApiError(error.message, t, error.status), error.correlationId, t)
  }

  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.code === 'ERR_NETWORK') {
      return t ? t('api.networkError') : 'Network error while contacting the API. For large uploads, confirm the backend is running and allows the selected file size.'
    }

    if (error.code === 'ECONNABORTED') {
      return t ? t('api.timeoutError') : 'The upload timed out. Please check your connection and try again.'
    }

    const response = error.response?.data
    const codedMessage = localizeApiErrorCode(response?.errorCode, t)
    if (codedMessage) {
      return appendCorrelationId(codedMessage, response?.correlationId, t)
    }

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

function localizeApiErrorCode(errorCode?: string, t?: Translate) {
  if (!errorCode) {
    return undefined
  }

  const fallback = (() => {
    switch (errorCode) {
      case 'SERVER_STORAGE_CAPACITY_LOW':
        return 'The server is temporarily unable to accept this video. Please try again later.'
      case 'UPLOAD_CONCURRENCY_LIMIT_REACHED':
        return 'The upload service is busy. Please try again shortly.'
      case 'ANALYSIS_QUEUE_UNAVAILABLE':
        return 'Analysis queue is temporarily unavailable. Please try again shortly.'
      case 'PLAN_NOT_FOUND':
        return 'The selected subscription plan was not found.'
      case 'PAYMENT_NOT_REQUIRED':
        return 'Payment is not required for this plan.'
      case 'PAYMENT_NOT_FOUND':
        return 'Payment was not found.'
      case 'PAYMENT_EXPIRED':
        return 'Payment expired before verification.'
      case 'PAYMENT_ALREADY_FINALIZED':
        return 'Payment is already finalized.'
      case 'PAYMENT_GATEWAY_UNAVAILABLE':
        return 'Payment gateway is unavailable.'
      case 'PAYMENT_VERIFICATION_FAILED':
        return 'Payment verification failed.'
      case 'PAYMENT_AMOUNT_MISMATCH':
        return 'Payment amount did not match the selected plan.'
      case 'MOCK_PAYMENT_UNAVAILABLE':
        return 'Mock payment controls are not available in this environment.'
      default:
        return undefined
    }
  })()

  if (!fallback || !t) {
    return fallback
  }

  const key = (() => {
    switch (errorCode) {
    case 'SERVER_STORAGE_CAPACITY_LOW':
      return 'api.serverStorageCapacityLow'
    case 'UPLOAD_CONCURRENCY_LIMIT_REACHED':
      return 'api.uploadBusy'
    case 'ANALYSIS_QUEUE_UNAVAILABLE':
      return 'api.analysisQueueUnavailable'
    case 'PLAN_NOT_FOUND':
      return 'subscriptions.planNotFound'
    case 'PAYMENT_NOT_REQUIRED':
      return 'subscriptions.paymentNotRequired'
    case 'PAYMENT_NOT_FOUND':
      return 'subscriptions.paymentNotFound'
    case 'PAYMENT_EXPIRED':
      return 'subscriptions.paymentExpiredBeforeVerification'
    case 'PAYMENT_ALREADY_FINALIZED':
      return 'subscriptions.paymentAlreadyFinalized'
    case 'PAYMENT_GATEWAY_UNAVAILABLE':
      return 'subscriptions.paymentGatewayUnavailable'
    case 'PAYMENT_VERIFICATION_FAILED':
      return 'subscriptions.paymentVerificationFailed'
    case 'PAYMENT_AMOUNT_MISMATCH':
      return 'subscriptions.paymentAmountMismatch'
    case 'MOCK_PAYMENT_UNAVAILABLE':
      return 'subscriptions.mockPaymentUnavailable'
    default:
      return undefined
    }
  })()

  if (!key) {
    return fallback
  }

  const translated = t(key)
  return translated === key ? fallback : translated
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
  if (normalized.includes('selected subscription plan was not found') || normalized.includes('subscription plan was not found')) {
    return t('subscriptions.planNotFound')
  }
  if (normalized.includes('payment is not required') || normalized.includes('does not require payment')) {
    return t('subscriptions.paymentNotRequired')
  }
  if (
    normalized.includes('payment gateway is unavailable') ||
    normalized.includes('production checkout is not configured') ||
    normalized.includes('live initiation requires official merchant')
  ) {
    return t('subscriptions.paymentGatewayUnavailable')
  }
  if (normalized.includes('mock payment controls are not available') || normalized.includes('mock payments are available only')) {
    return t('subscriptions.mockPaymentUnavailable')
  }
  if (normalized.includes('payment amount did not match') || normalized.includes('amount or currency did not match')) {
    return t('subscriptions.paymentAmountMismatch')
  }
  if (normalized.includes('payment expired before verification')) {
    return t('subscriptions.paymentExpiredBeforeVerification')
  }
  if (normalized.includes('payment is already finalized')) {
    return t('subscriptions.paymentAlreadyFinalized')
  }
  if (
    normalized.includes('payment verification failed') ||
    normalized.includes('callback verification is not configured') ||
    normalized.includes('callback did not report a successful payment') ||
    normalized.includes('callback signature verification failed') ||
    normalized.includes('verification order did not match') ||
    normalized.includes('provider transaction reference was already used') ||
    normalized.includes('did not include a valid provider transaction reference')
  ) {
    return t('subscriptions.paymentVerificationFailed')
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
  if (status === 413 || normalized.includes('request body is too large')) {
    return t('upload.absoluteMaxSizeError')
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
    errorCode: response.errorCode,
    status,
  })
}

export function getApiErrorCode(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.errorCode
  }

  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.errorCode
  }

  return undefined
}

export async function getAnalysisResult(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<AnalysisResult>>(`/api/videos/${videoId}/analysis`)
  if (!response.data.success || !response.data.data) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data
}

export async function claimGuestVideo(videoId: string | number, guestAccessToken: string) {
  const response = await apiClient.post<ApiResponse<boolean>>(`/api/videos/${videoId}/claim-guest`, { guestAccessToken })
  if (!response.data.success) {
    throw createApiRequestError(response.data, response.status)
  }
  return response.data.data ?? true
}

export async function getGuestJobStatus(videoId: string | number, guestAccessToken: string) {
  const response = await apiClient.get<ApiResponse<JobStatus>>(`/api/jobs/guest/${videoId}/status`, {
    headers: {
      'X-Guest-Video-Token': guestAccessToken,
    },
  })
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

export async function getSubscriptionStatus() {
  const response = await apiClient.get<ApiResponse<SubscriptionStatusResponse>>('/api/subscriptions/status')
  return unwrapApiResponse(response.data, response.status)
}

export async function getGuestUploadStatus() {
  const response = await apiClient.get<ApiResponse<GuestUploadStatusResponse>>('/api/subscriptions/guest-upload-status')
  return unwrapApiResponse(response.data, response.status)
}

export async function initiatePayment(planCode: string) {
  const response = await apiClient.post<ApiResponse<PaymentInitiationResponse>>('/api/payments/checkout', { planCode })
  return unwrapApiResponse(response.data, response.status)
}

export async function getPaymentStatus(orderId: string) {
  const response = await apiClient.get<ApiResponse<PaymentStatusResponse>>(`/api/payments/${encodeURIComponent(orderId)}`)
  return unwrapApiResponse(response.data, response.status)
}

export async function completeMockPayment(orderId: string, request: MockPaymentCompletionRequest) {
  const response = await apiClient.post<ApiResponse<PaymentStatusResponse>>(
    `/api/payments/mock/${encodeURIComponent(orderId)}/complete`,
    request,
  )
  return unwrapApiResponse(response.data, response.status)
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

export async function assignAdminUserRequests(userId: string | number, request: AdminAssignUserRequestsRequest) {
  const response = await apiClient.post<ApiResponse<AdminManualSubscriptionGrant>>(
    `/api/admin/users/${userId}/manual-requests`,
    request,
  )
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

function unwrapApiResponse<T>(response: ApiResponse<T>, status?: number) {
  if (!response.success || response.data === undefined) {
    throw createApiRequestError(response, status)
  }

  return response.data
}

let cachedDeviceFingerprint: string | null = null

function getDeviceFingerprint() {
  if (cachedDeviceFingerprint !== null) {
    return cachedDeviceFingerprint
  }

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    cachedDeviceFingerprint = ''
    return cachedDeviceFingerprint
  }

  const extendedNavigator = navigator as Navigator & { deviceMemory?: number }
  const screenInfo = window.screen
  // Non-invasive anti-abuse signals only; backend stores a keyed HMAC, not these raw values.
  const fingerprintParts = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') ?? '',
    navigator.platform,
    String(navigator.hardwareConcurrency ?? ''),
    String(extendedNavigator.deviceMemory ?? ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screenInfo.width}x${screenInfo.height}x${screenInfo.colorDepth}`,
    String(navigator.maxTouchPoints ?? 0),
  ]

  cachedDeviceFingerprint = fingerprintParts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join('|')

  return cachedDeviceFingerprint
}
