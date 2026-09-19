export type ApiResponse<T> = {
  success: boolean
  message: string
  data?: T
  errors: string[]
  correlationId?: string
  errorCode?: string
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

export type FreeTrialStatus = {
  accountRemainingScans: number
  deviceRemainingScans?: number | null
  ipRemainingScans?: number | null
  effectiveRemainingScans: number
}

export type SubscriptionStatusResponse = {
  planCode: string
  planName: string
  isAdmin: boolean
  isPaid: boolean
  subscriptionStatus: string
  startsAt?: string | null
  expiresAt?: string | null
  scanLimit?: number | null
  usedScans: number
  reservedScans: number
  remainingScans?: number | null
  maxVideoSizeBytes?: number | null
  allowsSmartScan: boolean
  allowsDetailedScan: boolean
  freeTrial?: FreeTrialStatus | null
}

export type GuestUploadStatusResponse = {
  canUpload: boolean
  remainingUploads: number
  blockReasonCode?: string | null
  maxVideoSizeBytes?: number | null
}

export type InitiatePaymentRequest = {
  planCode: string
}

export type PaymentInitiationResponse = {
  orderId: string
  provider: string
  status: string
  planCode: string
  planName: string
  amount: number
  currency: string
  expiresAt?: string | null
  paymentUrl?: string | null
  isMock: boolean
}

export type PaymentStatusResponse = {
  orderId: string
  provider: string
  status: string
  planCode: string
  planName: string
  amount: number
  currency: string
  providerTransactionId?: string | null
  initiatedAt: string
  verifiedAt?: string | null
  failedAt?: string | null
  expiresAt?: string | null
  subscriptionId?: number | null
  subscriptionStartsAt?: string | null
  subscriptionExpiresAt?: string | null
  failureReason?: string | null
}

export type MockPaymentCompletionRequest = {
  succeed: boolean
  amount?: number | null
  providerTransactionId?: string | null
  failureReason?: string | null
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
  isOriginalVideoAvailable?: boolean
  isReportAvailable?: boolean
  latestJobId?: number
  latestJobStatus?: string
  latestJobProgress?: number
  latestJobUpdatedAt?: string | null
  canRetry?: boolean
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
  retryCount: number
  maxRetryCount: number
  guestAccessToken?: string
  message: string
}

export type JobStatus = {
  jobId: number
  videoId: number
  originalName?: string
  status: string
  progress: number
  currentStep?: string
  lastCheckpoint?: string
  scanMode?: string
  completedSegments?: number
  totalSegments?: number
  analyzedCoverageSeconds?: number | null
  totalDurationSeconds?: number | null
  lastActivityAt?: string | null
  errorMessage?: string
  errorCode?: string
  userMessage?: string
  canRetry?: boolean
  retryCount: number
  maxRetryCount: number
  failedStage?: string
  nextRecommendedAction?: string
  technicalReferenceId?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  lastUpdatedAt?: string
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
  scanMode?: string
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

export type AdminMetric = {
  key: string
  label: string
  value: number
  tone: string
}

export type AdminStatusCount = {
  status: string
  count: number
}

export type AdminDailyActivity = {
  date: string
  count: number
}

export type AdminTopUser = {
  userId: number
  name: string
  email: string
  uploadCount: number
}

export type AdminRecentActivity = {
  type: string
  title: string
  description: string
  createdAt: string
}

export type AdminExternalRequestSummary = {
  providerName: string
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  failedRequests: number
  monthlyQuotaLimit: number
  monthlyUsed: number
  monthlyRemaining: number
  monthlySuccess: number
  monthlyFailed: number
  healthStatus: string
  circuitOpen: boolean
  circuitConsecutiveFailures: number
  circuitOpenUntil?: string
}

export type AdminCleanupSummary = {
  lastRunAt?: string
  lastStatus: string
  lastDurationMs: number
  lastFailureCount: number
  runsLast24Hours: number
  failuresLast24Hours: number
  pendingTemporaryFrameCleanup: number
  pendingOriginalVideoCleanup: number
  pendingDetailedPayloadCleanup: number
}

export type AdminDashboardSummary = {
  metrics: AdminMetric[]
  videoStatuses: AdminStatusCount[]
  jobStatuses: AdminStatusCount[]
  requestStatuses: AdminStatusCount[]
  uploadActivity: AdminDailyActivity[]
  analysisActivity: AdminDailyActivity[]
  topUsers: AdminTopUser[]
  recentActivity: AdminRecentActivity[]
  externalRequests: AdminExternalRequestSummary
  retentionCleanup: AdminCleanupSummary
}

export type AdminUserListItem = {
  userId: number
  name: string
  email: string
  role: string | number
  isActive: boolean
  emailConfirmed: boolean
  totalVideos: number
  completedVideos: number
  failedVideos: number
  createdAt: string
  updatedAt: string
}

export type AdminVideoListItem = {
  videoId: number
  userId: number
  ownerName: string
  ownerEmail: string
  originalName: string
  fileSize: number
  contentType?: string
  status: string
  createdAt: string
  updatedAt: string
  latestJobStatus?: string
  latestJobProgress?: number
  finalVerdict?: string
  aiGeneratedProbability?: number
  confidence?: number
  externalVerificationUsed: boolean
}

export type AdminMetadataSummary = {
  durationSeconds?: number
  resolution?: string
  fps?: number
  codec?: string
  audioCodec?: string
  bitrate?: number
  encoder?: string
  creationTime?: string
  hasMissingMetadata: boolean
}

export type AdminAnalysisSummary = {
  aiResultId: number
  label: string
  finalScore: number
  confidence: number
  visualScore: number
  metadataScore?: number
  temporalScore?: number
  summary?: string
  provider: string
  providerMode: string
  finalDecisionSource: string
  externalProviderName?: string
  externalProviderStatus?: string
  fallbackUsed: boolean
  fallbackReason?: string
  createdAt: string
}

export type AdminEvidenceItem = {
  type: string
  severity: string
  title: string
  description: string
  scoreImpact?: number
  timestampSeconds?: number
}

export type AdminSourceMatch = {
  platform: string
  title?: string
  uploadDatetime?: string
  similarityScore: number
  confidence: string
  rank: number
}

export type AdminJobListItem = {
  jobId: number
  videoId: number
  videoName: string
  userId: number
  userEmail: string
  status: string
  progress: number
  currentStep?: string
  errorMessage?: string
  errorCode?: string
  retryCount: number
  maxRetryCount: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export type AdminProviderRequestListItem = {
  requestId: number
  videoId: number
  videoName: string
  userId: number
  userEmail: string
  providerName: string
  providerMode: string
  status: string
  httpStatusCode?: number
  durationMs?: number
  errorMessage?: string
  requestStartedAt: string
  requestCompletedAt?: string
}

export type AdminProviderRequestUserSummary = {
  userId: number
  name: string
  email: string
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  failedRequests: number
  latestRequestAt?: string
  latestVideoName?: string
}

export type AdminVideoDetail = {
  video: AdminVideoListItem
  metadata?: AdminMetadataSummary
  analysis?: AdminAnalysisSummary
  evidence: AdminEvidenceItem[]
  originMatches: AdminSourceMatch[]
  jobs: AdminJobListItem[]
}

export type AdminAuditLog = {
  id: number
  userId?: number
  userName?: string
  userEmail?: string
  category: string
  action: string
  severity: string
  message: string
  resourceType?: string
  resourceId?: string
  httpMethod?: string
  path?: string
  statusCode?: number
  ipAddress?: string
  userAgent?: string
  detailsJson?: string
  correlationId?: string
  createdAt: string
}
