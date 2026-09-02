import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/client'
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
  }
})

describe('AuthProvider', () => {
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
})

function LogoutButton() {
  const auth = useAuth()
  return <button type="button" onClick={() => void auth.logout()}>Logout</button>
}
