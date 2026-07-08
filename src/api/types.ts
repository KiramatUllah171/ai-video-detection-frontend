export type ApiResponse<T> = {
  success: boolean
  message: string
  data?: T
  errors: string[]
}

export type UserProfile = {
  id: number
  name: string
  email: string
  role: string
  isActive?: boolean
  emailConfirmed?: boolean
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserProfile
}

export type PagedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type VideoHistoryItem = {
  videoId: number
  originalName: string
  fileSize: number
  contentType?: string
  fileExtension?: string
  status: string
  createdAt: string
  latestJobId?: number
  latestJobStatus?: string
  latestJobProgress?: number
  currentStep?: string
}

export type UploadVideoResponse = {
  videoId: number
  jobId: number
  status: string
  jobStatus: string
  originalName: string
  fileSize: number
  contentType: string
  message: string
}

export type JobStatus = {
  jobId: number
  videoId: number
  status: string
  progress: number
  currentStep?: string
  errorMessage?: string
  errorCode?: string
  retryCount: number
  maxRetryCount: number
  createdAt: string
  startedAt?: string
  completedAt?: string
}
