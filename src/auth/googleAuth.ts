const googleOAuthStateKey = 'ai-video.google-oauth-state'
const googleOAuthReturnPathKey = 'ai-video.google-oauth-return-path'

const env = import.meta.env as ImportMetaEnv & {
  VITE_GOOGLE_CLIENT_ID?: string
}

export function getGoogleClientId() {
  return env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export function getGoogleRedirectUri() {
  return `${window.location.origin}/auth/google/callback`
}

export function beginGoogleLogin(returnPath: string) {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('Google sign-in is not configured.')
  }

  const state = createOAuthState()
  sessionStorage.setItem(googleOAuthStateKey, state)
  sessionStorage.setItem(googleOAuthReturnPathKey, normalizeReturnPath(returnPath))

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })

  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}

export function consumeGoogleOAuthState(receivedState: string | null) {
  const storedState = sessionStorage.getItem(googleOAuthStateKey)
  sessionStorage.removeItem(googleOAuthStateKey)

  return Boolean(receivedState && storedState && receivedState === storedState)
}

export function consumeGoogleReturnPath() {
  const returnPath = sessionStorage.getItem(googleOAuthReturnPathKey)
  sessionStorage.removeItem(googleOAuthReturnPathKey)
  return normalizeReturnPath(returnPath ?? '/dashboard')
}

function createOAuthState() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function normalizeReturnPath(path: string) {
  return path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
}
