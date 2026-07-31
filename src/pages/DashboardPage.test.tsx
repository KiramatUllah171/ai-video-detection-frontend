import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
import { AuthContext } from '../auth/AuthContext'
import { LanguageProvider } from '../i18n/LanguageContext'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
  }
})

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('polls active dashboard rows and updates progress without navigation', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(historyResponse(51, 'Processing'))
      .mockResolvedValueOnce(historyResponse(77, 'Processing'))

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('51%')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(screen.getByText('77%')).toBeInTheDocument())
    expect(apiClient.get).toHaveBeenCalledTimes(2)
  })
})

function historyResponse(progress: number, status: string) {
  return {
    data: {
      success: true,
      message: '',
      errors: [],
      data: {
        items: [
          {
            videoId: 144,
            originalName: 'VID_20200803_134413.mp4',
            fileSize: 285_900_000,
            status,
            createdAt: '2026-07-31T13:55:00Z',
            latestJobId: 152,
            latestJobStatus: status,
            latestJobProgress: progress,
            latestJobUpdatedAt: '2026-07-31T13:56:00Z',
          },
          {
            videoId: 145,
            originalName: 'VID_20200803_134414.mp4',
            fileSize: 285_900_000,
            status: 'Processing',
            createdAt: '2026-07-31T13:56:00Z',
            latestJobId: 153,
            latestJobStatus: 'Processing',
            latestJobProgress: 22,
            latestJobUpdatedAt: '2026-07-31T13:56:00Z',
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
      },
    },
  }
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'User',
          },
          isAuthenticated: true,
          isLoading: false,
          login: vi.fn(),
          signup: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <LanguageProvider>
          <MemoryRouter>
            {ui}
          </MemoryRouter>
        </LanguageProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
