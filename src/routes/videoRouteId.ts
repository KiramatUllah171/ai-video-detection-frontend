const routeSalt = 48371
const routeMultiplier = 7919

export function toVideoRouteId(videoId: string | number) {
  const numericId = Number(videoId)
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return String(videoId)
  }

  return `v-${Math.trunc(numericId * routeMultiplier + routeSalt).toString(36)}`
}

export function fromVideoRouteId(routeId?: string) {
  if (!routeId) {
    return ''
  }

  if (/^\d+$/.test(routeId)) {
    return routeId
  }

  if (!routeId.startsWith('v-')) {
    return routeId
  }

  const encoded = Number.parseInt(routeId.slice(2), 36)
  if (!Number.isFinite(encoded)) {
    return routeId
  }

  const decoded = (encoded - routeSalt) / routeMultiplier
  return Number.isInteger(decoded) && decoded > 0 ? String(decoded) : routeId
}
