import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, apiClient, getGuestUploadStatus, getSubscriptionStatus } from '../api/client'
import type { SubscriptionStatusResponse, UserProfile } from '../api/types'
import { AuthContext } from '../auth/AuthContext'
import { LanguageProvider } from '../i18n/LanguageContext'
import { LoginPage } from './LoginPage'
import { UploadVideoPage } from './UploadVideoPage'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
    },
    getGuestUploadStatus: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    initiatePayment: vi.fn(),
    getPaymentStatus: vi.fn(),
    completeMockPayment: vi.fn(),
  }
})

describe('UploadVideoPage size preflight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(getGuestUploadStatus).mockResolvedValue({
      canUpload: true,
      remainingUploads: 1,
      blockReasonCode: null,
      maxVideoSizeBytes: 209_715_200,
    })
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        message: 'uploaded',
        errors: [],
        data: {
          videoId: 1,
          jobId: 2,
          originalName: 'sample.mp4',
          status: 'Queued',
          fileSize: 314_572_800,
          contentType: 'video/mp4',
        },
      },
    })
  })

  it('blocks free users above the 200 MB plan limit before upload', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(buildStatus({
      planCode: 'FREE',
      planName: 'Free',
      maxVideoSizeBytes: 209_715_200,
      isPaid: false,
      allowsDetailedScan: false,
    }))

    const { container } = renderPage()
    await waitFor(() => expect(getSubscriptionStatus).toHaveBeenCalled())

    await uploadFile(container, createSizedFile('free-too-large.mp4', 250 * 1_048_576))

    expect(await screen.findAllByText(/larger than your current plan allows/i)).toHaveLength(2)
    expect(screen.getByRole('dialog', { name: /upgrade subscription/i })).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('shows only the absolute size error for admin uploads above 300 MB', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(buildStatus({
      planCode: 'InternalUnlimited',
      planName: 'Internal unlimited',
      maxVideoSizeBytes: null,
      isAdmin: true,
      isPaid: true,
      allowsDetailedScan: true,
    }))

    const { container } = renderPage({ role: 'Admin' })
    await waitFor(() => expect(getSubscriptionStatus).toHaveBeenCalled())

    await uploadFile(container, createSizedFile('admin-too-large.mp4', 301 * 1_048_576))

    expect(await screen.findByText('Videos larger than 300 MB are not supported at this time.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /upgrade subscription/i })).not.toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('allows a pro user to start a 300 MB upload', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(buildStatus({
      planCode: 'PRO',
      planName: 'Pro',
      maxVideoSizeBytes: 314_572_800,
      isPaid: true,
      allowsDetailedScan: true,
    }))

    const { container } = renderPage()
    await waitFor(() => expect(getSubscriptionStatus).toHaveBeenCalled())

    await uploadFile(container, createSizedFile('pro-at-limit.mp4', 300 * 1_048_576))
    await userEvent.click(screen.getByLabelText(/right to upload/i))
    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1))
    expect(vi.mocked(apiClient.post).mock.calls[0][2]?.timeout).toBe(20 * 60 * 1000)
  })

  it('allows a first-time guest to upload without showing the subscription popup', async () => {
    const { container } = renderPage({}, { isAuthenticated: false, includeLoginRoute: true })
    await waitFor(() => expect(getGuestUploadStatus).toHaveBeenCalled())
    await screen.findByRole('button', { name: /start analysis/i })

    await uploadFile(container, createSizedFile('guest-first.mp4', 20 * 1_048_576))
    await userEvent.click(screen.getByLabelText(/right to upload/i))
    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1))
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).toBe('/api/videos/guest-upload')
    expect(screen.queryByRole('dialog', { name: /upgrade subscription/i })).not.toBeInTheDocument()
  })

  it('sends a returning used guest to sign in instead of showing the upload form', async () => {
    vi.mocked(getGuestUploadStatus).mockResolvedValue({
      canUpload: false,
      remainingUploads: 0,
      blockReasonCode: 'GUEST_LIMIT_REACHED',
      maxVideoSizeBytes: 209_715_200,
    })

    renderPage({}, { isAuthenticated: false, includeLoginRoute: true })

    expect(await screen.findByText('Your free guest scan has already been used. Please sign in or create an account to upload another video or view this video result.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start analysis/i })).not.toBeInTheDocument()
  })

  it('does not show the subscription popup for guest upload entitlement errors', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new ApiRequestError('Guest upload limit reached.', {
      errorCode: 'GUEST_LIMIT_REACHED',
      status: 403,
    }))

    const { container } = renderPage({}, { isAuthenticated: false, includeLoginRoute: true })
    await waitFor(() => expect(getGuestUploadStatus).toHaveBeenCalled())
    await screen.findByRole('button', { name: /start analysis/i })

    await uploadFile(container, createSizedFile('guest-second.mp4', 20 * 1_048_576))
    await userEvent.click(screen.getByLabelText(/right to upload/i))
    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }))

    expect(await screen.findByText('Your free guest scan has already been used. Please sign in or create an account to upload another video or view this video result.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /upgrade subscription/i })).not.toBeInTheDocument()
  })

  it('prevents duplicate upload submissions while the first request is in flight', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(buildStatus({
      planCode: 'PRO',
      planName: 'Pro',
      maxVideoSizeBytes: 314_572_800,
      isPaid: true,
      allowsDetailedScan: true,
    }))
    let resolveUpload: ((value: Awaited<ReturnType<typeof apiClient.post>>) => void) | undefined
    vi.mocked(apiClient.post).mockReturnValue(new Promise((resolve) => {
      resolveUpload = resolve
    }))

    const { container } = renderPage()
    await waitFor(() => expect(getSubscriptionStatus).toHaveBeenCalled())

    await uploadFile(container, createSizedFile('pro-at-limit.mp4', 20 * 1_048_576))
    await userEvent.click(screen.getByLabelText(/right to upload/i))
    const startButton = screen.getByRole('button', { name: /start analysis/i })

    await userEvent.dblClick(startButton)

    expect(apiClient.post).toHaveBeenCalledTimes(1)
    resolveUpload?.({
      status: 200,
      data: {
        success: true,
        message: 'uploaded',
        errors: [],
        data: {
          videoId: 1,
          jobId: 2,
          originalName: 'sample.mp4',
          status: 'Queued',
          fileSize: 20 * 1_048_576,
          contentType: 'video/mp4',
        },
      },
    })
  })

  it('disables the dropzone with an upgrade prompt when free trial scans are used up', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(buildStatus({
      planCode: 'FREE',
      planName: 'Free',
      isPaid: false,
      remainingScans: 0,
      freeTrial: {
        accountRemainingScans: 0,
        deviceRemainingScans: 0,
        ipRemainingScans: 0,
        effectiveRemainingScans: 0,
      },
    }))

    const { container } = renderPage()
    await waitFor(() => expect(getSubscriptionStatus).toHaveBeenCalled())

    await screen.findByText('Free trial scans used up')

    const dropzone = container.querySelector('.upload-dropzone.exhausted')
    expect(dropzone).toBeInstanceOf(HTMLElement)
    expect(within(dropzone as HTMLElement).getByText('Free trial scans used up')).toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeDisabled()

    await userEvent.click(within(dropzone as HTMLElement).getByRole('button', { name: /upgrade plan/i }))

    expect(screen.getByRole('dialog', { name: /upgrade subscription/i })).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('sends guests to sign in when they click Detailed Scan', async () => {
    renderPage({}, { isAuthenticated: false, includeLoginRoute: true })

    await userEvent.click(await screen.findByText('Detailed'))

    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})

function renderPage(
  user: Partial<UserProfile> = {},
  options: { isAuthenticated?: boolean; includeLoginRoute?: boolean } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const isAuthenticated = options.isAuthenticated ?? true
  const authUser = isAuthenticated
    ? { id: 1, name: 'Test User', email: 'test@example.com', role: 'User', ...user }
    : null
  const content = options.includeLoginRoute ? (
    <Routes>
      <Route path="/upload" element={<UploadVideoPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  ) : (
    <UploadVideoPage />
  )

  return render(
    <LanguageProvider>
      <AuthContext.Provider
        value={{
          user: authUser,
          isAuthenticated,
          isLoading: false,
          login: vi.fn(),
          loginWithGoogle: vi.fn(),
          loginWithFacebook: vi.fn(),
          signup: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/upload']}>{content}</MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>
    </LanguageProvider>,
  )
}

async function uploadFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('File input was not found.')
  }

  await userEvent.upload(input, file)
}

function createSizedFile(name: string, size: number) {
  const file = new File(['x'], name, { type: 'video/mp4' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function buildStatus(overrides: Partial<SubscriptionStatusResponse>): SubscriptionStatusResponse {
  return {
    planCode: 'FREE',
    planName: 'Free',
    isAdmin: false,
    isPaid: false,
    subscriptionStatus: 'Active',
    scanLimit: 2,
    usedScans: 0,
    reservedScans: 0,
    remainingScans: 2,
    maxVideoSizeBytes: 209_715_200,
    allowsSmartScan: true,
    allowsDetailedScan: false,
    freeTrial: {
      accountRemainingScans: 2,
      deviceRemainingScans: 2,
      ipRemainingScans: 2,
      effectiveRemainingScans: 2,
    },
    ...overrides,
  }
}
