type Translate = (key: string, values?: Record<string, string | number>) => string

function keyForValue(prefix: string, value?: string | null) {
  if (!value) {
    return ''
  }

  return `${prefix}.${value.trim().toLowerCase().replace(/[\s_-]+/g, '')}`
}

function translatedOrFallback(t: Translate, key: string, fallback: string) {
  const translated = t(key)
  return translated === key ? fallback : translated
}

export function localizeRoleName(role: string | number | undefined | null, t: Translate) {
  const raw = String(role ?? '').trim()
  const normalized = raw.toLowerCase()
  if (!raw) return t('role.user')
  if (normalized === '0' || normalized === 'user') return t('role.user')
  if (normalized === '1' || normalized === 'admin') return t('role.admin')
  if (normalized === '2' || normalized === 'reviewer') return t('role.reviewer')
  if (normalized === '3' || normalized === 'enterpriseadmin' || normalized === 'enterprise admin') return t('role.enterpriseAdmin')
  return raw
}

export function localizeStatusValue(status: string | undefined | null, t: Translate) {
  if (!status) {
    return t('common.notAvailable')
  }

  return translatedOrFallback(t, keyForValue('status', status), status)
}

export function localizeVerdict(value: string | undefined | null, t: Translate) {
  if (!value) {
    return t('common.notAvailable')
  }

  const normalized = value.trim().toLowerCase()
  if (normalized.includes('likely real')) return t('status.likelyreal')
  if (normalized.includes('likely ai') || normalized.includes('ai-generated')) return t('status.likelyaigenerated')
  if (normalized.includes('suspicious')) return t('status.suspicious')
  if (normalized.includes('inconclusive')) return t('status.inconclusive')
  return localizeStatusValue(value, t)
}

export function localizeProviderValue(value: string | undefined | null, t: Translate) {
  if (!value) {
    return t('common.notAvailable')
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized.includes('bitmind')) return t('analysis.externalVerification')
  if (normalized === 'externalprovider' || normalized === 'externalverification') return t('analysis.externalVerification')
  if (normalized === 'fallbacklocal' || normalized === 'local' || normalized === 'internal') return t('analysis.internalVerification')
  return localizeStatusValue(value, t)
}

export function localizeEvidenceTitle(value: string | undefined | null, t: Translate) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return t('common.notAvailable')
  if (normalized === 'missing creation time') return t('analysis.missingCreationTimeTitle')
  if (normalized === 'missing encoder metadata') return t('analysis.missingEncoderTitle')
  if (normalized === 'no audio stream detected') return `${t('analysis.audio')}: ${t('analysis.notAvailable')}`
  if (normalized === 'heavy compression indicator') return `${t('analysis.bitrate')}: ${t('status.low')}`
  if (normalized === 'incomplete core metadata' || normalized === 'unreadable metadata') return t('analysis.metadataUnavailable')
  if (normalized === 'detector disagreement') return t('analysis.disagreementWarning')
  if (normalized === 'low confidence result') return t('analysis.lowConfidenceWarning')
  if (normalized === 'external provider notice') return t('analysis.externalVerification')
  return value!.trim()
}

export function localizeEvidenceType(value: string | undefined | null, t: Translate) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return t('common.notAvailable')
  if (normalized === 'metadatawarning') return t('analysis.metadataWarnings')
  if (normalized === 'aiframescore') return t('analysis.aiFrameGroup')
  return localizeProviderValue(value, t)
}

export function localizeDisplayMessage(value: string | undefined | null, t: Translate) {
  if (!value) {
    return t('common.notAvailable')
  }

  const trimmed = value.trim()
  const normalized = trimmed.toLowerCase().replace(/[.!؟]+$/g, '')
  if (normalized === 'analysis completed') return t('dynamic.analysisCompleted')
  if (normalized === 'the video metadata does not include a creation timestamp') return t('analysis.missingCreationTimeDescription')
  if (normalized === 'the video metadata does not identify the encoder') return t('analysis.missingEncoderDescription')
  if (normalized === 'this video may be processed by an external ai detection provider for analysis') return t('analysis.externalProviderNotice')
  if (normalized.includes('provider authentication failed')) return t('analysis.fallbackWarning')
  if (normalized.includes('external bitmind verification') || normalized.includes('bitmind')) {
    return trimmed
      .replace(/External\s+BitMind\s+verification/gi, t('analysis.externalVerification'))
      .replace(/BitMind/gi, t('analysis.externalVerification'))
  }

  const uploadMatch = trimmed.match(/^(.+)\s+uploaded a video\.$/i)
  if (uploadMatch) {
    return t('dynamic.uploadedVideoDescription', { user: uploadMatch[1] })
  }

  return trimmed
}

export function localizeOriginTitle(value: string | undefined | null, t: Translate) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return t('admin.videoDetail.internalVideo')
  }

  const knownInternal = normalized.match(/^previously analyzed internal video(?:\s*#\d+)?$/)
  if (knownInternal) {
    return t('admin.videoDetail.internalVideo')
  }

  return localizeDisplayMessage(value, t)
}
