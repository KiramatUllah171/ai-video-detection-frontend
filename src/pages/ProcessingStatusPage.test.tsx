import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, apiClient, cancelAnalysis, getGuestJobStatus, getSubscriptionStatus, pauseAnalysis, reanalyzeVideo, resumeAnalysis, retryAnalysis } from '../api/client'
import { authStorage } from '../auth/authStorage'
import { saveGuestVideoAccess } from '../guest/guestVideoAccess'
import { LanguageProvider } from '../i18n/LanguageContext'
import { ProcessingStatusPage } from './ProcessingStatusPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
    cancelAnalysis: vi.fn(),
    getAnalysisResult: vi.fn(),
    getGuestJobStatus: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    initiatePayment: vi.fn(),
    pauseAnalysis: vi.fn(),
    reanalyzeVideo: vi.fn(),
    resumeAnalysis: vi.fn(),
    retryAnalysis: vi.fn(),
    getPaymentStatus: vi.fn(),
    completeMockPayment: vi.fn(),
  }
})

describe('ProcessingStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    authStorage.setSession({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'User' },
    })
    vi.mocked(getSubscriptionStatus).mockResolvedValue({
      planCode: 'FREE',
      planName: 'Free Trial',
      isPaid: false,
      isAdmin: false,
      subscriptionStatus: 'Active',
      scanLimit: 2,
      usedScans: 2,
      reservedScans: 0,
      remainingScans: 0,
      maxVideoSizeBytes: 209_715_200,
      allowsSmartScan: true,
      allowsDetailedScan: false,
      freeTrial: {
        accountRemainingScans: 0,
        deviceRemainingScans: 0,
        ipRemainingScans: 0,
        effectiveRemainingScans: 0,
      },
    })
  })

  it('shows a safe failed message and retries the same video once', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        errors: [],
        data: {
          jobId: 20,
          videoId: 10,
          status: 'Failed',
          progress: 78,
          currentStep: 'Failed: External BitMind verification failed',
          errorCode: 'ProviderAuthenticationFailed',
          userMessage: 'The external analysis service is temporarily unavailable. Please try again later.',
          canRetry: true,
          retryCount: 0,
          maxRetryCount: 3,
          technicalReferenceId: 'JOB-20',
          createdAt: '2026-07-17T10:00:00Z',
          lastUpdatedAt: '2026-07-17T10:01:00Z',
        },
      },
    })
    vi.mocked(retryAnalysis).mockResolvedValue({
      videoId: 10,
      jobId: 21,
      status: 'Queued',
      jobStatus: 'Queued',
      originalName: 'sample.mp4',
      fileSize: 100,
      contentType: 'video/mp4',
      retryCount: 1,
      maxRetryCount: 3,
      message: 'Analysis retry queued.',
    })

    renderWithProviders(<ProcessingStatusPage />)

    expect(await screen.findAllByText("We couldn't complete the analysis.")).toHaveLength(3)
    expect(screen.getByText("We couldn't complete the analysis. Please retry.")).toBeInTheDocument()
    expect(screen.queryByText('Failed: External verification failed')).not.toBeInTheDocument()
    expect(screen.queryByText('The external analysis service is temporarily unavailable. Please try again later.')).not.toBeInTheDocument()
    expect(screen.queryByText(/BitMind/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/HTTP 401/i)).not.toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry analysis/i })
    await userEvent.click(retryButton)
    await userEvent.click(retryButton)

    await waitFor(() => expect(retryAnalysis).toHaveBeenCalledTimes(1))
    expect(retryAnalysis).toHaveBeenCalledWith('10')
  })

  it('shows cancelled-specific content and can start analysis again', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        errors: [],
        data: {
          jobId: 20,
          videoId: 10,
          originalName: 'very-long-uploaded-file-name-for-review.mp4',
          status: 'Cancelled',
          progress: 66,
          currentStep: 'Analysis cancelled',
          scanMode: 'Detailed',
          completedSegments: 5,
          totalSegments: 8,
          retryCount: 0,
          maxRetryCount: 3,
          createdAt: '2026-07-17T10:00:00Z',
          lastUpdatedAt: '2026-07-17T10:01:00Z',
        },
      },
    })
    let resolveReanalysis: ((value: Awaited<ReturnType<typeof reanalyzeVideo>>) => void) | undefined
    vi.mocked(reanalyzeVideo).mockReturnValue(new Promise((resolve) => {
      resolveReanalysis = resolve
    }))

    renderWithProviders(<ProcessingStatusPage />)

    expect(await screen.findAllByText('Analysis cancelled')).toHaveLength(4)
    expect(screen.getByText('Processing was stopped. You can start analysis again while the 3-day video availability period is active.')).toBeInTheDocument()
    expect(screen.getByText('Processing stopped after 5 of 8 parts.')).toBeInTheDocument()
    expect(screen.getByText('very-long-uploaded-file-name-for-review.mp4')).toBeInTheDocument()
    expect(screen.getByText('Detailed Scan')).toBeInTheDocument()
    expect(screen.queryByText('Your video is uploaded and queued.')).not.toBeInTheDocument()
    expect(screen.queryByText('Analyzing different parts - 5 of 8')).not.toBeInTheDocument()
    expect(screen.queryByText(['Job', 'ID'].join(' '))).not.toBeInTheDocument()
    expect(screen.queryByText(['Video', 'ID'].join(' '))).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel analysis/i })).not.toBeInTheDocument()

    const startAgainButton = screen.getByRole('button', { name: /start analysis again/i })
    await userEvent.click(startAgainButton)
    await userEvent.click(startAgainButton)

    await waitFor(() => expect(reanalyzeVideo).toHaveBeenCalledTimes(1))
    expect(reanalyzeVideo).toHaveBeenCalledWith('10')
    expect(screen.getByRole('button', { name: /starting analysis/i })).toBeDisabled()
    resolveReanalysis?.({
      videoId: 10,
      jobId: 21,
      status: 'Queued',
      jobStatus: 'Queued',
      originalName: 'very-long-uploaded-file-name-for-review.mp4',
      fileSize: 100,
      contentType: 'video/mp4',
      retryCount: 0,
      maxRetryCount: 3,
      message: 'Video queued for reanalysis.',
    })
  })

  it('uses the application modal for cancellation and disables duplicate requests', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    let resolveCancellation: ((value: Awaited<ReturnType<typeof cancelAnalysis>>) => void) | undefined
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        errors: [],
        data: {
          jobId: 20,
          videoId: 10,
          originalName: 'sample.mp4',
          status: 'Processing',
          progress: 42,
          currentStep: 'Analyzing video',
          scanMode: 'Basic',
          completedSegments: 2,
          totalSegments: 8,
          retryCount: 0,
          maxRetryCount: 3,
          createdAt: '2026-07-17T10:00:00Z',
          lastUpdatedAt: '2026-07-17T10:01:00Z',
        },
      },
    })
    vi.mocked(cancelAnalysis).mockReturnValue(new Promise((resolve) => {
      resolveCancellation = resolve
    }))

    renderWithProviders(<ProcessingStatusPage />)

    await userEvent.click(await screen.findByRole('button', { name: /cancel analysis/i }))

    expect(screen.getByRole('dialog', { name: 'Cancel analysis?' })).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to cancel this analysis\? Processing will stop/)).toBeInTheDocument()
    expect(confirmSpy).not.toHaveBeenCalled()

    const keepAnalyzingButton = screen.getByRole('button', { name: /keep analyzing/i })
    const cancelButtons = screen.getAllByRole('button', { name: /cancel analysis/i })
    const destructiveButton = cancelButtons[cancelButtons.length - 1]
    await userEvent.click(destructiveButton)

    expect(cancelAnalysis).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /cancelling/i })).toBeDisabled()
    expect(keepAnalyzingButton).toBeDisabled()

    resolveCancellation?.({
      jobId: 20,
      videoId: 10,
      originalName: 'sample.mp4',
      status: 'CancelRequested',
      progress: 42,
      currentStep: 'Cancelling analysis',
      scanMode: 'Basic',
      completedSegments: 2,
      totalSegments: 8,
      retryCount: 0,
      maxRetryCount: 3,
      createdAt: '2026-07-17T10:00:00Z',
      lastUpdatedAt: '2026-07-17T10:02:00Z',
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    confirmSpy.mockRestore()
  })

  it('uses the pause modal and shows pausing state without native confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    let resolvePause: ((value: Awaited<ReturnType<typeof pauseAnalysis>>) => void) | undefined
    mockStatus({
      status: 'Processing',
      progress: 42,
      currentStep: 'Analyzing video',
      completedSegments: 2,
      totalSegments: 8,
    })
    vi.mocked(pauseAnalysis).mockReturnValue(new Promise((resolve) => {
      resolvePause = resolve
    }))

    renderWithProviders(<ProcessingStatusPage />)

    await userEvent.click(await screen.findByRole('button', { name: /pause analysis/i }))

    expect(screen.getByRole('dialog', { name: 'Pause analysis?' })).toBeInTheDocument()
    expect(screen.getByText(/Processing will stop at the next safe checkpoint/)).toBeInTheDocument()
    expect(confirmSpy).not.toHaveBeenCalled()

    const keepAnalyzingButton = screen.getByRole('button', { name: /keep analyzing/i })
    const pauseButtons = screen.getAllByRole('button', { name: /pause analysis/i })
    await userEvent.click(pauseButtons[pauseButtons.length - 1])

    expect(pauseAnalysis).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button', { name: /pausing/i }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(keepAnalyzingButton).toBeDisabled()

    resolvePause?.(buildStatus({ status: 'PauseRequested', currentStep: 'Pausing analysis' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    confirmSpy.mockRestore()
  })

  it('localizes the pause requested status in Urdu without raw English text', async () => {
    localStorage.setItem('ai-video-detection-language', 'ur')
    mockStatus({
      status: 'PauseRequested',
      progress: 22,
      currentStep: 'Pausing analysis',
      completedSegments: 0,
      totalSegments: 3,
    })

    renderWithProviders(<ProcessingStatusPage />)

    expect(await screen.findAllByText('تجزیہ رک رہا ہے')).not.toHaveLength(0)
    expect(screen.getByText('موجودہ عمل محفوظ مقام تک پہنچ رہا ہے۔ مکمل شدہ پیش رفت محفوظ رہے گی۔')).toBeInTheDocument()
    expect(screen.getByText('پروسیسنگ اگلے محفوظ مقام کے بعد رک جائے گی۔ محفوظ پیش رفت: 0 از 3 حصے۔')).toBeInTheDocument()
    expect(screen.getByText('ویڈیو فائل')).toBeInTheDocument()
    expect(screen.queryByText('Pausing analysis')).not.toBeInTheDocument()
    expect(screen.queryByText(/safe checkpoint/i)).not.toBeInTheDocument()
  })

  it('localizes the pause confirmation modal in Urdu', async () => {
    localStorage.setItem('ai-video-detection-language', 'ur')
    mockStatus({
      status: 'Processing',
      progress: 42,
      currentStep: 'Analyzing video',
      completedSegments: 2,
      totalSegments: 8,
    })

    renderWithProviders(<ProcessingStatusPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'تجزیہ روکیں' }))

    expect(screen.getByRole('dialog', { name: 'تجزیہ روکیں؟' })).toBeInTheDocument()
    expect(screen.getByText('پروسیسنگ اگلے محفوظ مقام پر رک جائے گی۔ آپ کی پیش رفت اور مکمل شدہ نتائج محفوظ رہیں گے، اور آپ بعد میں یہ تجزیہ دوبارہ جاری کر سکیں گے۔')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تجزیہ جاری رکھیں' })).toBeInTheDocument()
    expect(screen.queryByText(/Keep analyzing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Processing will stop/i)).not.toBeInTheDocument()
  })

  it('shows paused content and resumes without confirmation', async () => {
    mockStatus({
      status: 'Paused',
      progress: 66,
      currentStep: 'Paused during detailed scan',
      scanMode: 'Detailed',
      completedSegments: 5,
      totalSegments: 8,
    })
    vi.mocked(resumeAnalysis).mockResolvedValue(buildStatus({
      status: 'ResumeRequested',
      progress: 66,
      currentStep: 'Resuming analysis',
      scanMode: 'Detailed',
      completedSegments: 5,
      totalSegments: 8,
    }))

    renderWithProviders(<ProcessingStatusPage />)

    expect(await screen.findAllByText('Analysis paused')).toHaveLength(3)
    expect(screen.getByText('Processing is paused. Completed progress is preserved, and the video can be resumed while the 3-day video availability period is active.')).toBeInTheDocument()
    expect(screen.getByText('Analysis paused after 5 of 8 parts.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pause analysis/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /resume analysis/i }))

    expect(resumeAnalysis).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders status-aware pause and resume actions', async () => {
    const states = [
      ['PauseRequested', /pausing/i, /cancel analysis/i],
      ['ResumeRequested', /resuming/i, /cancel analysis/i],
      ['Completed', null, null],
      ['Failed', null, null],
      ['Cancelled', null, null],
    ] as const

    for (const [status, expectedAction, expectedCancel] of states) {
      vi.clearAllMocks()
      mockStatus({ status, progress: 50, currentStep: status })
      const { unmount } = renderWithProviders(<ProcessingStatusPage />)
      await screen.findAllByText(status === 'PauseRequested' ? 'Pausing' : status === 'ResumeRequested' ? 'Resuming' : new RegExp(status, 'i'))

      if (expectedAction) {
        expect(screen.getByRole('button', { name: expectedAction })).toBeDisabled()
      } else {
        expect(screen.queryByRole('button', { name: /pause analysis|resume analysis/i })).not.toBeInTheDocument()
      }

      if (expectedCancel) {
        expect(screen.getByRole('button', { name: expectedCancel })).toBeInTheDocument()
      } else {
        expect(screen.queryByRole('button', { name: /cancel analysis/i })).not.toBeInTheDocument()
      }

      unmount()
    }
  })

  it('shows application errors for failed pause and resume requests', async () => {
    mockStatus({ status: 'Processing', progress: 30, currentStep: 'Analyzing video' })
    vi.mocked(pauseAnalysis).mockRejectedValue(new Error('This analysis cannot be paused in its current state.'))

    const { unmount } = renderWithProviders(<ProcessingStatusPage />)
    await userEvent.click(await screen.findByRole('button', { name: /pause analysis/i }))
    const pauseButtons = screen.getAllByRole('button', { name: /pause analysis/i })
    await userEvent.click(pauseButtons[pauseButtons.length - 1])

    expect(await screen.findAllByText("We couldn't complete the analysis. Please retry.")).toHaveLength(2)
    unmount()

    vi.clearAllMocks()
    mockStatus({ status: 'Paused', progress: 30, currentStep: 'Paused during smart scan' })
    vi.mocked(resumeAnalysis).mockRejectedValue(new Error('The analysis was cancelled before it could be resumed.'))
    renderWithProviders(<ProcessingStatusPage />)
    await userEvent.click(await screen.findByRole('button', { name: /resume analysis/i }))

    expect(await screen.findByText("We couldn't complete the analysis. Please retry.")).toBeInTheDocument()
  })

  it('opens the subscription upgrade popup when retry fails with a quota error', async () => {
    mockStatus({
      status: 'Failed',
      progress: 78,
      currentStep: 'Failed: provider temporarily unavailable',
      canRetry: true,
    })
    vi.mocked(retryAnalysis).mockRejectedValue(new ApiRequestError('Free-trial scan quota is exhausted.', {
      errorCode: 'FREE_TRIAL_EXHAUSTED',
      status: 402,
    }))

    renderWithProviders(<ProcessingStatusPage />)

    await userEvent.click(await screen.findByRole('button', { name: /retry analysis/i }))

    expect(await screen.findByRole('dialog', { name: 'Upgrade Subscription' })).toBeInTheDocument()
    expect(screen.getByText('Your free trial scans are used up. Upgrade to keep analyzing videos.')).toBeInTheDocument()
    expect(screen.queryByText('Free-trial scan quota is exhausted.')).not.toBeInTheDocument()
  })

  it('does not show the subscription upgrade popup for admin retry errors', async () => {
    authStorage.setUser({
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'Admin',
    })
    mockStatus({
      status: 'Failed',
      progress: 78,
      currentStep: 'Failed: provider temporarily unavailable',
      canRetry: true,
    })
    vi.mocked(retryAnalysis).mockRejectedValue(new ApiRequestError('Free-trial scan quota is exhausted.', {
      errorCode: 'FREE_TRIAL_EXHAUSTED',
      status: 402,
    }))

    renderWithProviders(<ProcessingStatusPage />)

    await userEvent.click(await screen.findByRole('button', { name: /retry analysis/i }))

    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Upgrade Subscription' })).not.toBeInTheDocument()
  })

  it('hides Upload Another for completed guest results', async () => {
    authStorage.clear()
    saveGuestVideoAccess(10, 'guest-token')
    vi.mocked(getGuestJobStatus).mockResolvedValue(buildStatus({
      status: 'Completed',
      progress: 100,
      currentStep: 'Analysis complete',
    }))

    renderWithProviders(<ProcessingStatusPage />)

    expect(await screen.findByText('Your analysis is ready')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in to view result/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /upload another/i })).not.toBeInTheDocument()
  })
})

function buildStatus(overrides: Partial<Awaited<ReturnType<typeof pauseAnalysis>>> = {}) {
  return {
    jobId: 20,
    videoId: 10,
    originalName: 'sample.mp4',
    status: 'Processing',
    progress: 42,
    currentStep: 'Analyzing video',
    scanMode: 'Basic',
    completedSegments: 2,
    totalSegments: 8,
    retryCount: 0,
    maxRetryCount: 3,
    createdAt: '2026-07-17T10:00:00Z',
    lastUpdatedAt: '2026-07-17T10:01:00Z',
    ...overrides,
  }
}

function mockStatus(overrides: Partial<ReturnType<typeof buildStatus>> = {}) {
  vi.mocked(apiClient.get).mockResolvedValue({
    data: {
      success: true,
      message: '',
      errors: [],
      data: buildStatus(overrides),
    },
  })
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/processing/10']}>
          <Routes>
            <Route path="/processing/:videoId" element={ui} />
            <Route path="/analysis/:videoId" element={<div>Analysis result</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  )
}
