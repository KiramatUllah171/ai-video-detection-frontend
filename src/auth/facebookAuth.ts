const facebookOAuthStateKey = 'ai-video.facebook-oauth-state'
const facebookOAuthReturnPathKey = 'ai-video.facebook-oauth-return-path'

const env = import.meta.env as ImportMetaEnv & {
  VITE_FACEBOOK_APP_ID?: string
}

export function getFacebookAppId() {
  return env.VITE_FACEBOOK_APP_ID?.trim() ?? ''
}

export function getFacebookRedirectUri() {
  return `${window.location.origin}/auth/facebook/callback`
}

export function beginFacebookLogin(returnPath: string) {
  const appId = getFacebookAppId()
  if (!appId) {
    throw new Error('Facebook sign-in is not configured.')
  }

  const state = createOAuthState()
  sessionStorage.setItem(facebookOAuthStateKey, state)
  sessionStorage.setItem(facebookOAuthReturnPathKey, normalizeReturnPath(returnPath))

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getFacebookRedirectUri(),
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  })

  window.location.assign(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`)
}

export function consumeFacebookOAuthState(receivedState: string | null) {
  const storedState = sessionStorage.getItem(facebookOAuthStateKey)
  sessionStorage.removeItem(facebookOAuthStateKey)

  return Boolean(receivedState && storedState && receivedState === storedState)
}

export function consumeFacebookReturnPath() {
  const returnPath = sessionStorage.getItem(facebookOAuthReturnPathKey)
  sessionStorage.removeItem(facebookOAuthReturnPathKey)
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
