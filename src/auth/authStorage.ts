import type { AuthResponse, UserProfile } from '../api/types'

const accessTokenKey = 'ai-video.accessToken'
const userKey = 'ai-video.user'

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(accessTokenKey)
  },
  getUser(): UserProfile | null {
    const raw = localStorage.getItem(userKey)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  },
  setSession(session: AuthResponse) {
    localStorage.setItem(accessTokenKey, session.accessToken)
    localStorage.setItem(userKey, JSON.stringify(session.user))
  },
  setUser(user: UserProfile) {
    localStorage.setItem(userKey, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(accessTokenKey)
    localStorage.removeItem(userKey)
  },
}
