import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient, claimGuestVideo, refreshAuthSession } from '../api/client'
import type { ApiResponse, AuthResponse, UserProfile } from '../api/types'
import { getGuestVideoAccessEntries, removeGuestVideoAccess } from '../guest/guestVideoAccess'
import { authSessionClearedEvent, authStorage } from './authStorage'
import { AuthContext } from './AuthContext'
import { normalizeUserProfile } from './roleUtils'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UserProfile | null>(() => authStorage.getUser())
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(() => authStorage.getExpiresAt())
  const [isLoading, setIsLoading] = useState(true)

  const clearFrontendSession = useCallback(() => {
    setUser(null)
    setSessionExpiresAt(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    window.addEventListener(authSessionClearedEvent, clearFrontendSession)
    return () => window.removeEventListener(authSessionClearedEvent, clearFrontendSession)
  }, [clearFrontendSession])

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      const storedAccessToken = authStorage.getAccessToken()
      const storedExpiresAt = authStorage.getExpiresAt()

      if (storedAccessToken && (!storedExpiresAt || authStorage.isSessionExpired())) {
        authStorage.clear()
        setIsLoading(false)
        return
      }

      if (!storedAccessToken) {
        try {
          const refreshedSession = await refreshAuthSession()
          if (!cancelled && refreshedSession) {
            setUser(normalizeUserProfile(refreshedSession.user))
            setSessionExpiresAt(refreshedSession.expiresAt)
          }
        } catch {
          authStorage.clear()
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
          setUser(normalizeUserProfile(response.data.data))
        }
      } catch {
        authStorage.clear()
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

  useEffect(() => {
    if (!sessionExpiresAt) {
      return
    }

    const expiresInMs = Date.parse(sessionExpiresAt) - Date.now()
    if (expiresInMs <= 0) {
      authStorage.clear()
      return
    }

    const timeoutId = window.setTimeout(() => {
      authStorage.clear()
    }, expiresInMs)

    return () => window.clearTimeout(timeoutId)
  }, [sessionExpiresAt])

  const applySession = useCallback((session: AuthResponse) => {
    authStorage.setSession(session)
    setUser(normalizeUserProfile(session.user))
    setSessionExpiresAt(session.expiresAt)
  }, [])

  const claimStoredGuestVideos = useCallback(async () => {
    const guestVideos = getGuestVideoAccessEntries()
    if (guestVideos.length === 0) {
      return
    }

    const results = await Promise.allSettled(
      guestVideos.map(async ({ videoId, token }) => {
        await claimGuestVideo(videoId, token)
        removeGuestVideoAccess(videoId)
      }),
    )

    if (results.some((result) => result.status === 'fulfilled')) {
      await queryClient.invalidateQueries({ queryKey: ['video-history'] })
    }
  }, [queryClient])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', { email, password })
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.errors[0] ?? response.data.message)
      }
      applySession(response.data.data)
      await claimStoredGuestVideos()
    },
    [applySession, claimStoredGuestVideos],
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
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && authStorage.getAccessToken() && !authStorage.isSessionExpired()),
      isLoading,
      login,
      signup,
      logout,
    }),
    [isLoading, login, logout, signup, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
