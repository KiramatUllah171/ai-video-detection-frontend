import type { AuthResponse, UserProfile } from '../api/types'

const accessTokenKey = 'ai-video.accessToken'
const refreshTokenKey = 'ai-video.refreshToken'
const userKey = 'ai-video.user'

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(accessTokenKey)
  },
  getRefreshToken() {
    return localStorage.getItem(refreshTokenKey)
  },
  getUser(): UserProfile | null {
    const raw = localStorage.getItem(userKey)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  },
  setSession(session: AuthResponse) {
    localStorage.setItem(accessTokenKey, session.accessToken)
    localStorage.setItem(refreshTokenKey, session.refreshToken)
    localStorage.setItem(userKey, JSON.stringify(session.user))
  },
  setUser(user: UserProfile) {
    localStorage.setItem(userKey, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(accessTokenKey)
    localStorage.removeItem(refreshTokenKey)
    localStorage.removeItem(userKey)
  },
}
