import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiClient } from '../api/client'
import type { ApiResponse, AuthResponse, UserProfile } from '../api/types'
import { authStorage } from './authStorage'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => authStorage.getUser())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      if (!authStorage.getAccessToken()) {
        try {
          const refreshResponse = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/refresh', {})
          if (!cancelled && refreshResponse.data.success && refreshResponse.data.data) {
            authStorage.setSession(refreshResponse.data.data)
            setUser(refreshResponse.data.data.user)
          }
        } catch {
          authStorage.clear()
          if (!cancelled) {
            setUser(null)
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false)
          }
        }
        return
      }

      try {
        const response = await apiClient.get<ApiResponse<UserProfile>>('/api/auth/me')
        if (!cancelled && response.data.success && response.data.data) {
          authStorage.setUser(response.data.data)
          setUser(response.data.data)
        }
      } catch {
        authStorage.clear()
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadCurrentUser()
    return () => {
      cancelled = true
    }
  }, [])

  const applySession = useCallback((session: AuthResponse) => {
    authStorage.setSession(session)
    setUser(session.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', { email, password })
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.errors[0] ?? response.data.message)
      }
      applySession(response.data.data)
    },
    [applySession],
  )

  const signup = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string) => {
      const response = await apiClient.post<ApiResponse<boolean>>('/api/auth/signup', {
        name,
        email,
        password,
        confirmPassword,
      })
      if (!response.data.success) {
        throw new Error(response.data.errors[0] ?? response.data.message)
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout', {})
    } finally {
      authStorage.clear()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && authStorage.getAccessToken()),
      isLoading,
      login,
      signup,
      logout,
    }),
    [isLoading, login, logout, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
