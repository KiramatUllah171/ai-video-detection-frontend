import type { AuthResponse, UserProfile } from '../api/types'

const accessTokenKey = 'ai-video.accessToken'
const userKey = 'ai-video.user'
const expiresAtKey = 'ai-video.expiresAt'

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(accessTokenKey)
  },
  getExpiresAt() {
    return localStorage.getItem(expiresAtKey)
  },
  isSessionExpired() {
    const expiresAt = localStorage.getItem(expiresAtKey)
    return expiresAt ? Date.parse(expiresAt) <= Date.now() : false
  },
  getUser(): UserProfile | null {
    const raw = localStorage.getItem(userKey)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  },
  setSession(session: AuthResponse) {
    localStorage.setItem(accessTokenKey, session.accessToken)
    localStorage.setItem(userKey, JSON.stringify(session.user))
    localStorage.setItem(expiresAtKey, session.expiresAt)
  },
  setUser(user: UserProfile) {
    localStorage.setItem(userKey, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(accessTokenKey)
    localStorage.removeItem(userKey)
    localStorage.removeItem(expiresAtKey)
  },
}
