import type { Page } from '@playwright/test'

// Deterministic presentation fixtures. No real account, upload, payment or API
// is touched by these checks. Long values intentionally stress intrinsic sizing.
export const longName = 'Investigation_' + 'longfilename'.repeat(14) + '.mp4'
const date = '2026-09-01T10:00:00Z'
const email = 'reviewer.' + 'longaddress'.repeat(8) + '@example.test'
const user = { id: 1, userId: 1, name: 'Responsive Review Account', email, role: 'Admin', isActive: true, emailConfirmed: true, totalVideos: 12, completedVideos: 8, failedVideos: 1, createdAt: date, updatedAt: date }
const video = { videoId: 10, userId: 1, ownerName: user.name, ownerEmail: email, originalName: longName, fileSize: 10485760, contentType: 'video/mp4', status: 'Completed', createdAt: date, updatedAt: date, latestJobStatus: 'Completed', latestJobProgress: 100, finalVerdict: 'LikelyReal', aiGeneratedProbability: 12, confidence: 88, externalVerificationUsed: true, isOriginalVideoAvailable: true, isReportAvailable: true }
const evidence = [{ id: 1, type: 'Visual', severity: 'Warning', title: 'Detailed visual evidence', description: 'Evidence description with a reference https://example.test/' + 'reference'.repeat(20), scoreImpact: 0.2 }]
const matches = [{ id: 1, videoId: 10, platform: 'Public archive', title: longName, uploadDatetime: date, similarityScore: 0.82, rank: 1, confidence: 'High' }]
const metadata = { videoId: 10, codec: 'h264', audioCodec: 'aac', fps: 30, resolution: '1920 × 1080', durationSeconds: 124, bitrate: 1000000, encoder: 'Encoder_' + 'version'.repeat(20), creationTime: date, hasMissingMetadata: false, createdAt: date }
const analysis = { videoId: 10, aiResultId: 1, modelVersion: 'Model_' + 'version'.repeat(14), modelCapability: 'video_temporal', isMock: false, aiGeneratedProbability: 12, likelyRealProbability: 88, confidencePercentage: 88, visualScore: 0.12, metadataScore: 0.2, temporalScore: 0.14, finalScore: 0.12, confidence: 0.88, label: 'LikelyReal', summary: 'The available evidence suggests this video is likely real.', warnings: ['Review the evidence before making a decision.'], providerMode: 'Detailed', scanMode: 'Detailed', provider: 'External', finalDecisionSource: 'External', fallbackUsed: false, createdAt: date, evidenceItems: evidence,
  componentScoresJson: JSON.stringify({ video: { ai_score: 0.12 }, frame: { ai_score: 0.2 }, combined: { adjusted_score: 0.12 } }) }
const job = { jobId: 20, videoId: 10, originalName: longName, videoName: longName, userId: 1, userEmail: email, status: 'Processing', progress: 42, currentStep: 'Analyzing representative segments', scanMode: 'Detailed', completedSegments: 4, totalSegments: 10, retryCount: 0, maxRetryCount: 3, createdAt: date, updatedAt: date, lastUpdatedAt: date }
const counts = [{ status: 'Completed', count: 12 }, { status: 'Processing', count: 4 }, { status: 'Failed', count: 1 }]
const activity = Array.from({ length: 14 }, (_, i) => ({ date: `2026-08-${String(i + 10).padStart(2, '0')}`, count: (i % 5) + 1 }))
const summary = {
  metrics: ['users', 'videos', 'completed', 'processing', 'failed'].map((key) => ({ key, label: key, value: 12345, tone: 'success' })),
  videoStatuses: counts, jobStatuses: counts, requestStatuses: counts, uploadActivity: activity, analysisActivity: activity,
  topUsers: [{ userId: 1, name: user.name, email, uploadCount: 12 }],
  recentActivity: [{ type: 'Upload', title: longName, description: email, createdAt: date }],
  externalRequests: { providerName: 'External', totalRequests: 20, pendingRequests: 4, completedRequests: 12, failedRequests: 4, monthlyQuotaLimit: 100, monthlyUsed: 20, monthlyRemaining: 80, monthlySuccess: 12, monthlyFailed: 4, healthStatus: 'Healthy', circuitOpen: false, circuitConsecutiveFailures: 0 },
  retentionCleanup: { lastRunAt: date, lastStatus: 'Completed', lastDurationMs: 1000, lastFailureCount: 0, runsLast24Hours: 24, failuresLast24Hours: 0, pendingTemporaryFrameCleanup: 0, pendingOriginalVideoCleanup: 2, pendingDetailedPayloadCleanup: 1 },
}

export async function mockApp(page: Page, language = 'en', options: { exhausted?: boolean; role?: string; jobStatus?: string; empty?: boolean; error?: boolean } = {}) {
  await page.addInitScript((lang) => {
    if (!localStorage.getItem('ai-video-detection-language')) {
      localStorage.setItem('ai-video-detection-language', lang)
    }
  }, language)
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (!path.startsWith('/api/')) return route.continue()
    const sessionUser = { ...user, role: options.role ?? 'Admin' }
    const paged = (items: unknown[]) => ({ items: options.empty ? [] : items, page: Number(url.searchParams.get('page') ?? 1), pageSize: 20, totalCount: options.empty ? 0 : 40, totalPages: 2 })
    let data: unknown
    if (path === '/api/auth/refresh' || path === '/api/auth/login') data = { accessToken: 'responsive-test-token', refreshToken: '', expiresAt: new Date(Date.now() + 3600000).toISOString(), user: sessionUser }
    else if (path === '/api/auth/me') data = sessionUser
    else if (path.startsWith('/api/auth/')) data = true
    else if (options.error) return route.fulfill({ status: 503, json: { success: false, errors: ['Service temporarily unavailable. Please try again.'], message: 'Service temporarily unavailable.' } })
    else if (path === '/api/videos/history') data = paged([video, { ...video, videoId: 11, status: 'Processing', latestJobStatus: 'Processing', latestJobProgress: 42 }, { ...video, videoId: 12, isOriginalVideoAvailable: false }])
    else if (path === '/api/subscriptions/status') data = { planCode: 'FREE', planName: 'Free Trial', isAdmin: false, isPaid: false, subscriptionStatus: 'Active', scanLimit: 2, usedScans: options.exhausted ? 2 : 0, reservedScans: 0, remainingScans: options.exhausted ? 0 : 2, maxVideoSizeBytes: 209715200, allowsSmartScan: true, allowsDetailedScan: false, freeTrial: { accountRemainingScans: options.exhausted ? 0 : 2, effectiveRemainingScans: options.exhausted ? 0 : 2 } }
    else if (path.endsWith('/analysis')) data = analysis
    else if (path.endsWith('/metadata')) data = metadata
    else if (path.endsWith('/origin-matches')) data = matches
    else if (path.startsWith('/api/jobs/')) data = { ...job, status: options.jobStatus ?? 'Processing', canRetry: true }
    else if (path === '/api/admin/dashboard/summary') data = summary
    else if (path === '/api/admin/users') data = paged([user])
    else if (path === '/api/admin/videos') data = paged([video])
    else if (path.endsWith('/file')) return route.fulfill({ contentType: 'video/mp4', body: Buffer.from([]) })
    else if (/\/api\/admin\/videos\/\d+$/.test(path)) data = { video, metadata, analysis, evidence, originMatches: matches, jobs: [job] }
    else if (path === '/api/admin/provider-request-users') data = paged([{ ...user, totalRequests: 20, pendingRequests: 4, completedRequests: 12, failedRequests: 4, latestRequestAt: date, latestVideoName: longName }])
    else if (path === '/api/admin/provider-requests') data = paged([{ requestId: 1, videoId: 10, videoName: longName, userId: 1, userEmail: email, providerName: 'External', providerMode: 'Detailed', status: 'Completed', httpStatusCode: 200, durationMs: 12000, requestStartedAt: date, requestCompletedAt: date }])
    else if (path === '/api/admin/logs') data = paged([{ id: 1, userName: user.name, category: 'Video', action: 'Review', severity: 'Information', message: 'Review reference ' + 'unbrokentext'.repeat(20), correlationId: 'reference'.repeat(30), createdAt: date }])
    else throw new Error(`Unmocked API request: ${path}`)
    await route.fulfill({ json: { success: true, data, errors: [], message: '' } })
  })
}
