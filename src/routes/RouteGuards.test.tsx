import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { UserProfile } from '../api/types'
import { AdminRoute } from './AdminRoute'
import { ProtectedRoute } from './ProtectedRoute'

describe('route guards', () => {
  it('redirects unauthenticated users away from protected pages', () => {
    renderWithAuth(null, false, (
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Protected dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    ))

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument()
  })

  it('redirects non-admin users away from admin pages', () => {
    renderWithAuth({ id: 7, name: 'Regular User', email: 'user@example.com', role: 'User' }, true, (
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<div>Admin users</div>} />
        </Route>
        <Route path="/dashboard" element={<div>User dashboard</div>} />
      </Routes>
    ), '/admin/users')

    expect(screen.getByText('User dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin users')).not.toBeInTheDocument()
  })

  it('allows admin users through admin pages', () => {
    renderWithAuth({ id: 1, name: 'Admin User', email: 'admin@example.com', role: 'Admin' }, true, (
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<div>Admin users</div>} />
        </Route>
        <Route path="/dashboard" element={<div>User dashboard</div>} />
      </Routes>
    ), '/admin/users')

    expect(screen.getByText('Admin users')).toBeInTheDocument()
    expect(screen.queryByText('User dashboard')).not.toBeInTheDocument()
  })
})

function renderWithAuth(
  user: UserProfile | null,
  isAuthenticated: boolean,
  routes: React.ReactElement,
  initialEntry = '/dashboard',
) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>{routes}</MemoryRouter>
    </AuthContext.Provider>,
  )
}
