import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, claimGuestVideo, refreshAuthSession } from '../api/client'
import { getGuestVideoToken, saveGuestVideoAccess } from '../guest/guestVideoAccess'
import { authStorage } from './authStorage'
import { useAuth } from './AuthContext'
import { AuthProvider } from './AuthProvider'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
    claimGuestVideo: vi.fn().mockResolvedValue(true),
    refreshAuthSession: vi.fn().mockResolvedValue(null),
  }
})

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
    vi.clearAllMocks()
  })

  it('clears protected query cache when the user logs out', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(['private-dashboard'], { totalUploads: 10 })
    authStorage.setSession({
      accessToken: 'token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'User' },
    })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        errors: [],
        data: { id: 1, name: 'Test User', email: 'test@example.com', role: 'User' },
      },
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, message: '', errors: [], data: true } })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LogoutButton />
        </AuthProvider>
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))

    await waitFor(() => expect(queryClient.getQueryData(['private-dashboard'])).toBeUndefined())
    expect(authStorage.getAccessToken()).toBeNull()
  })

  it('claims stored guest videos after login so they appear in account history', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    saveGuestVideoAccess(42, 'guest-token')
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (url === '/api/auth/login') {
        return {
          data: {
            success: true,
            message: '',
            errors: [],
            data: {
              accessToken: 'token',
              refreshToken: 'refresh-token',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
              user: { id: 7, name: 'Signed User', email: 'signed@example.com', role: 'User' },
            },
          },
        }
      }

      throw new Error(`Unexpected POST ${url}`)
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoginButton />
        </AuthProvider>
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(claimGuestVideo).toHaveBeenCalledWith('42', 'guest-token')
    })
    expect(getGuestVideoToken(42)).toBeNull()
  })

  it('does not run startup refresh while the browser is on the Google callback route', async () => {
    window.history.pushState({}, '', '/auth/google/callback?code=google-code&state=oauth-state')
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthStatus />
        </AuthProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('ready'))
    expect(refreshAuthSession).not.toHaveBeenCalled()
  })

  it('clears an expired stored session during startup', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    authStorage.setSession({
      accessToken: 'expired-token',
      refreshToken: '',
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      user: { id: 8, name: 'Expired User', email: 'expired@example.com', role: 'User' },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthStatus />
        </AuthProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('ready'))
    expect(authStorage.getAccessToken()).toBeNull()
    expect(authStorage.getUser()).toBeNull()
    expect(refreshAuthSession).not.toHaveBeenCalled()
  })
})

function LogoutButton() {
  const auth = useAuth()
  return <button type="button" onClick={() => void auth.logout()}>Logout</button>
}

function LoginButton() {
  const auth = useAuth()
  return <button type="button" onClick={() => void auth.login('signed@example.com', 'Password123!')}>Login</button>
}

function AuthStatus() {
  const auth = useAuth()
  return <div data-testid="auth-status">{auth.isLoading ? 'loading' : 'ready'}</div>
}
