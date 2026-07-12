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

export type EvidenceItem = {
  id: number
  type: string
  severity: string
  title: string
  description: string
  scoreImpact?: number
  timestampSeconds?: number
  videoFrameId?: number
}

export type AnalysisResult = {
  videoId: number
  aiResultId: number
  modelId?: string
  modelVersion?: string
  modelCapability?: string
  isMock: boolean
  aiGeneratedProbability: number
  likelyRealProbability: number
  confidencePercentage: number
  visualScore: number
  metadataScore?: number
  temporalScore?: number
  finalScore: number
  confidence: number
  label: string
  summary?: string
  warnings: string[]
  provider?: string
  providerMode?: string
  finalDecisionSource?: string
  externalProviderName?: string
  externalProviderStatus?: string
  externalScore?: number
  externalConfidence?: number
  externalLabel?: string
  fallbackUsed?: boolean
  fallbackReason?: string
  providerWarnings?: string[]
  localAnalysisSummary?: string
  externalAnalysisSummary?: string
  hybridDecisionSummary?: string
  providerRequestedAt?: string
  providerCompletedAt?: string
  modelDisagreement?: boolean
  strongFrameEvidence?: boolean
  minimumRecommendedScore?: number
  ensembleStrategy?: string
  componentScoresJson?: string
  createdAt: string
  evidenceItems: EvidenceItem[]
}

export type SourceMatch = {
  id: number
  videoId: number
  platform: string
  title?: string
  uploadDatetime?: string
  similarityScore: number
  durationMatchScore?: number
  hashMatchScore?: number
  metadataMatchScore?: number
  rank: number
  confidence: string
  details?: string
}

export type MetadataResult = {
  videoId: number
  codec?: string
  audioCodec?: string
  fps?: number
  resolution?: string
  durationSeconds?: number
  bitrate?: number
  encoder?: string
  creationTime?: string
  hasMissingMetadata: boolean
  warningsJson?: string
  createdAt: string
}
