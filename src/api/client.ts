import axios, { AxiosError } from 'axios'
import type { ApiResponse, AuthResponse } from './types'
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

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Network error while contacting the API. For large uploads, confirm the backend is running and allows the selected file size.'
    }

    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Please try again or use a smaller file.'
    }

    const response = error.response?.data
    return response?.errors?.[0] ?? response?.message ?? error.message
  }

  return error instanceof Error ? error.message : 'Request failed.'
}
