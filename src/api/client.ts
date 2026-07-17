import axios, { AxiosError } from 'axios'
import type { AnalysisResult, ApiResponse, AuthResponse, MetadataResult, SourceMatch, UploadVideoResponse } from './types'
import { authStorage } from '../auth/authStorage'

const env = import.meta.env as Record<string, string | undefined>
const baseURL =
  env.VITE_API_BASE_URL ??
  env.REACT_APP_API_BASE_URL ??
  'http://localhost:5166'

export const apiClient = axios.create({
  baseURL,
})

apiClient.interceptors.request.use((config) => {
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
      const refreshToken = authStorage.getRefreshToken()
      if (refreshToken) {
        try {
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers['x-refresh-attempted'] = 'true'
          const refreshResponse = await axios.post<ApiResponse<AuthResponse>>(
            `${baseURL}/api/auth/refresh`,
            { refreshToken },
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
    }

    return Promise.reject(error)
  },
)

type Translate = (key: string, values?: Record<string, string | number>) => string

export function getApiErrorMessage(error: unknown, t?: Translate) {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.code === 'ERR_NETWORK') {
      return t ? t('processing.defaultError') : 'Network error while contacting the API. For large uploads, confirm the backend is running and allows the selected file size.'
    }

    if (error.code === 'ECONNABORTED') {
      return t ? t('processing.defaultError') : 'The request timed out. Please try again or use a smaller file.'
    }

    const response = error.response?.data
    return localizeApiError(response?.errors?.[0] ?? response?.message ?? error.message, t)
  }

  return localizeApiError(error instanceof Error ? error.message : 'Request failed.', t)
}

function localizeApiError(message: string, t?: Translate) {
  if (!t) {
    return message
  }

  const normalized = message.trim().toLowerCase()
  if (normalized.includes('email is already registered')) {
    return t('signup.alreadyRegistered')
  }
  if (
    normalized.includes('unauthorized') ||
    normalized.includes('invalid email or password') ||
    normalized.includes('invalid refresh token') ||
    normalized.includes('user account is inactive') ||
    normalized.includes('user was not found')
  ) {
    return t('profile.unavailable')
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
    normalized.includes('no failed analysis job')
  ) {
    return t('processing.defaultError')
  }
  if (normalized.includes('request failed')) {
    return t('processing.defaultError')
  }
  return message
}

export async function getAnalysisResult(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<AnalysisResult>>(`/api/videos/${videoId}/analysis`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.errors?.[0] ?? response.data.message)
  }
  return response.data.data
}

export async function retryAnalysis(videoId: string | number) {
  const response = await apiClient.post<ApiResponse<UploadVideoResponse>>(`/api/videos/${videoId}/retry-analysis`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.errors?.[0] ?? response.data.message)
  }
  return response.data.data
}

export async function getOriginMatches(videoId: string | number) {
  const response = await apiClient.get<ApiResponse<SourceMatch[]>>(`/api/videos/${videoId}/origin-matches`)
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.errors?.[0] ?? response.data.message)
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
