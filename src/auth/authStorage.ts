import type { AuthResponse, UserProfile } from '../api/types'
import { normalizeUserProfile } from './roleUtils'

const accessTokenKey = 'ai-video.accessToken'
const userKey = 'ai-video.user'
const expiresAtKey = 'ai-video.expiresAt'
export const authSessionClearedEvent = 'ai-video.auth-session-cleared'

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
    if (!raw) {
      return null
    }

    try {
      return normalizeUserProfile(JSON.parse(raw) as UserProfile)
    } catch {
      this.clear()
      return null
    }
  },
  setSession(session: AuthResponse) {
    localStorage.setItem(accessTokenKey, session.accessToken)
    localStorage.setItem(userKey, JSON.stringify(normalizeUserProfile(session.user)))
    localStorage.setItem(expiresAtKey, session.expiresAt)
  },
  setUser(user: UserProfile) {
    localStorage.setItem(userKey, JSON.stringify(normalizeUserProfile(user)))
  },
  clear() {
    localStorage.removeItem(accessTokenKey)
    localStorage.removeItem(userKey)
    localStorage.removeItem(expiresAtKey)
    window.dispatchEvent(new Event(authSessionClearedEvent))
  },
}
