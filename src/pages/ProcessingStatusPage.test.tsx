import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, retryAnalysis } from '../api/client'
import { LanguageProvider } from '../i18n/LanguageContext'
import { ProcessingStatusPage } from './ProcessingStatusPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
    getAnalysisResult: vi.fn(),
    retryAnalysis: vi.fn(),
  }
})

describe('ProcessingStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    expect(await screen.findAllByText("We couldn't complete the analysis.")).toHaveLength(2)
    expect(screen.getByText('The external analysis service is temporarily unavailable. Please try again later.')).toBeInTheDocument()
    expect(screen.queryByText(/HTTP 401/i)).not.toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry analysis/i })
    await userEvent.click(retryButton)
    await userEvent.click(retryButton)

    await waitFor(() => expect(retryAnalysis).toHaveBeenCalledTimes(1))
    expect(retryAnalysis).toHaveBeenCalledWith('10')
  })
})

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
