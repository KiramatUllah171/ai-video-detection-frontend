const guestVideoAccessStorageKey = 'ai-video-detection-guest-videos'

type GuestVideoAccessRecord = {
  token: string
  createdAt: string
}

type GuestVideoAccessStore = Record<string, GuestVideoAccessRecord>

export function saveGuestVideoAccess(videoId: string | number, token: string) {
  const normalizedVideoId = String(videoId)
  if (!normalizedVideoId || !token) {
    return
  }

  const store = readStore()
  store[normalizedVideoId] = {
    token,
    createdAt: new Date().toISOString(),
  }
  writeStore(store)
}

export function getGuestVideoToken(videoId: string | number | undefined) {
  if (!videoId) {
    return null
  }

  return readStore()[String(videoId)]?.token ?? null
}

export function removeGuestVideoAccess(videoId: string | number | undefined) {
  if (!videoId) {
    return
  }

  const store = readStore()
  delete store[String(videoId)]
  writeStore(store)
}

function readStore(): GuestVideoAccessStore {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(guestVideoAccessStorageKey)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as GuestVideoAccessStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: GuestVideoAccessStore) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(guestVideoAccessStorageKey, JSON.stringify(store))
}
