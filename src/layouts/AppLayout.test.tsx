import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { LanguageProvider } from '../i18n/LanguageContext'
import { AppLayout } from './AppLayout'

describe('AppLayout profile dropdown', () => {
  it('opens, displays current user data, and closes with Escape', async () => {
    render(
      <LanguageProvider>
        <AuthContext.Provider
          value={{
            user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'User' },
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            signup: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<div>Dashboard</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </LanguageProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /test user/i }))

    expect(screen.getByRole('menu', { name: /user profile/i })).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Account type')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: /user profile/i })).not.toBeInTheDocument()
  })

  it('labels unauthenticated mobile visitors as guests and hides logout', async () => {
    render(
      <LanguageProvider>
        <AuthContext.Provider
          value={{
            user: null,
            isAuthenticated: false,
            isLoading: false,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            signup: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <MemoryRouter initialEntries={['/upload']}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/upload" element={<div>Upload</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </LanguageProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /user profile/i }))

    expect(screen.getByRole('dialog', { name: /account/i })).toBeInTheDocument()
    expect(screen.getAllByText('Guest').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument()
  })
})
