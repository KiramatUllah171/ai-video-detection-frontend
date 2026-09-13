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

export function localizeDisplayMessage(value: string | undefined | null, t: Translate): string {
  if (!value) {
    return t('common.notAvailable')
  }

  const trimmed = value.trim()
  const normalized = normalizeDisplayText(trimmed)
  const exactKey = dynamicMessageKeys[normalized]
  if (exactKey) {
    return t(exactKey)
  }

  const failedStepMatch = trimmed.match(/^Failed:\s*(.+)$/i)
  if (failedStepMatch) {
    return t('dynamic.failedStep', { message: localizeDisplayMessage(failedStepMatch[1], t) })
  }

  const segmentProgressMatch = trimmed.match(/^Analyzing different parts\s*-\s*(\d+)\s+of\s+(\d+)$/i)
  if (segmentProgressMatch) {
    return t('processing.segmentProgress', {
      completed: segmentProgressMatch[1],
      total: segmentProgressMatch[2],
    })
  }

  const analyzingSegmentMatch = trimmed.match(/^Analyzing segment\s+(\d+)$/i)
  if (analyzingSegmentMatch) {
    return t('dynamic.analyzingSegment', { segment: analyzingSegmentMatch[1] })
  }

  const frameScoreMatch = trimmed.match(/^Frame\s+(\d+)\s+at\s+([0-9.]+)s\s+returned score\s+([0-9.]+)\s+with confidence\s+([0-9.]+)\.?$/i)
  if (frameScoreMatch) {
    return t('dynamic.frameScoreDescription', {
      frame: frameScoreMatch[1],
      timestamp: frameScoreMatch[2],
      score: frameScoreMatch[3],
      confidence: frameScoreMatch[4],
    })
  }

  const metadataWarningMatch = trimmed.match(/^Metadata warning detected:\s*(.+)\.?$/i)
  if (metadataWarningMatch) {
    return t('dynamic.metadataWarningDetected', { warning: metadataWarningMatch[1] })
  }

  const pausedDuringMatch = trimmed.match(/^Paused during\s+(.+)$/i)
  if (pausedDuringMatch) {
    return t('dynamic.pausedDuringScan', { scan: localizeScanModeLabel(pausedDuringMatch[1], t) })
  }

  const pausedAtMatch = trimmed.match(/^Paused at\s+(.+)$/i)
  if (pausedAtMatch) {
    return t('dynamic.pausedAtCheckpoint', { checkpoint: localizeCheckpoint(pausedAtMatch[1], t) })
  }

  if (normalized === 'the video metadata does not include a creation timestamp') return t('analysis.missingCreationTimeDescription')
  if (normalized === 'the video metadata does not identify the encoder') return t('analysis.missingEncoderDescription')
  if (normalized === 'this video may be processed by an external ai detection provider for analysis') return t('analysis.externalProviderNotice')
  if (normalized.includes('provider authentication failed')) return t('analysis.fallbackWarning')
  if (normalized.includes('external bitmind verification') || normalized.includes('bitmind')) {
    return trimmed
      .replace(/External\s+BitMind\s+verification/gi, t('analysis.externalVerification'))
      .replace(/BitMind/gi, t('analysis.externalVerification'))
  }
  if (
    normalized.includes('production checkout is not configured') ||
    normalized.includes('live initiation requires official merchant')
  ) {
    return t('subscriptions.paymentGatewayUnavailable')
  }
  if (
    normalized.includes('callback verification is not configured') ||
    normalized.includes('callback did not report a successful payment') ||
    normalized.includes('callback signature verification failed')
  ) {
    return t('subscriptions.paymentVerificationFailed')
  }

  const uploadMatch = trimmed.match(/^(.+)\s+uploaded a video\.$/i)
  if (uploadMatch) {
    return t('dynamic.uploadedVideoDescription', { user: uploadMatch[1] })
  }

  return trimmed
}

const dynamicMessageKeys: Record<string, string> = {
  'ai model is not configured': 'dynamic.aiModelNotConfigured',
  'analyzing video': 'dynamic.analyzingVideo',
  'analysis cancelled': 'dynamic.analysisCancelled',
  'analysis completed': 'dynamic.analysisCompleted',
  'analysis job became stale and was recovered safely please retry': 'dynamic.staleJobRecovered',
  'analysis job started': 'dynamic.analysisJobStarted',
  'analysis paused': 'processing.pausedPanelTitle',
  'analysis paused at a safe checkpoint': 'dynamic.analysisPausedSafeCheckpoint',
  'analysis pause was requested by the user': 'dynamic.analysisPauseRequestedByUser',
  'analysis processing resumed': 'dynamic.analysisProcessingResumed',
  'analysis queue is temporarily unavailable please try again shortly': 'api.analysisQueueUnavailable',
  'analysis queue is temporarily unavailable please try uploading again shortly': 'api.analysisQueueUnavailable',
  'analysis resume queued': 'dynamic.analysisResumeQueued',
  'analysis resume was requested by the user': 'dynamic.analysisResumeRequestedByUser',
  'analysis was cancelled': 'dynamic.analysisCancelled',
  'analysis was cancelled by the user': 'dynamic.analysisCancelledByUser',
  'cancelling analysis': 'dynamic.cancellingAnalysis',
  'cancellation requested': 'dynamic.cancellationRequested',
  'checking internal video matches': 'dynamic.checkingInternalMatches',
  'evidence items generated': 'dynamic.evidenceItemsGenerated',
  'final scoring completed': 'dynamic.finalScoringCompleted',
  'frame hash generation completed': 'dynamic.frameHashGenerationCompleted',
  'frame hash generation started': 'dynamic.frameHashGenerationStarted',
  'internal video matching completed': 'dynamic.internalMatchingCompleted',
  'internal video matching started': 'dynamic.internalMatchingStarted',
  'job retry queued': 'dynamic.jobRetryQueued',
  'mock payment created': 'subscriptions.paymentCreated',
  'mock payment failed': 'subscriptions.mockPaymentFailed',
  'mock payment marked as failed': 'subscriptions.mockPaymentFailed',
  'mock payments are available only in development when explicitly enabled': 'subscriptions.mockPaymentUnavailable',
  'payment created': 'subscriptions.paymentCreated',
  'payment expired before verification': 'subscriptions.paymentExpiredBeforeVerification',
  'payment gateway is unavailable': 'subscriptions.paymentGatewayUnavailable',
  'payment is already finalized': 'subscriptions.paymentAlreadyFinalized',
  'payment provider transaction reference was already used': 'subscriptions.paymentVerificationFailed',
  'payment verification did not include a valid provider transaction reference': 'subscriptions.paymentVerificationFailed',
  'payment verification order did not match the callback order': 'subscriptions.paymentVerificationFailed',
  'payment verification failed': 'subscriptions.paymentVerificationFailed',
  'payment was not found': 'subscriptions.paymentNotFound',
  'payment was already verified': 'subscriptions.paymentAlreadyVerified',
  'payment verified and subscription activated': 'subscriptions.paymentVerifiedActivated',
  'pause is already requested': 'dynamic.pauseAlreadyRequested',
  'pause requested': 'dynamic.pauseRequested',
  'paused analysis was cancelled by the user': 'dynamic.analysisCancelledByUser',
  'generating final result': 'dynamic.generatingFinalResult',
  'generating frame hashes': 'dynamic.generatingFrameHashes',
  'pausing analysis': 'dynamic.pausingAnalysis',
  'preparing video': 'processing.stepPreparingVideo',
  'preparing video for processing': 'dynamic.preparingVideoForProcessing',
  'resuming analysis': 'dynamic.resumingAnalysis',
  'retry queued for media processing': 'dynamic.retryQueuedMediaProcessing',
  'smart scan timeline plan created': 'dynamic.smartScanPlanCreated',
  'source video prepared for processing': 'dynamic.sourceVideoPrepared',
  'subscription plan was not found': 'subscriptions.planNotFound',
  'the analysis is already paused': 'dynamic.analysisAlreadyPaused',
  'the analysis is already queued or processing': 'dynamic.analysisAlreadyQueued',
  'the analysis was cancelled before it could be resumed': 'dynamic.analysisCancelledBeforeResume',
  'the result may be less reliable due to limited frames, low confidence, or missing metadata signals': 'analysis.lowConfidenceWarning',
  'the server is temporarily unable to process this video please try again later': 'api.serverStorageCapacityLow',
  'this analysis cannot be paused in its current state': 'processing.pauseUnconfirmedDescription',
  'this analysis cannot be resumed in its current state': 'processing.resumeUnconfirmedDescription',
  'this file could not be processed as a valid video': 'api.validationError',
  'this password reset link is ready to use': 'resetPassword.checkingStatus',
  'this verification request has already been handled': 'confirmEmail.alreadyHandled',
  'this verification request is invalid expired or has already been handled': 'confirmEmail.error',
  'this verification request is ready to confirm': 'confirmEmail.readyMessage',
  'this verification request was declined the unconfirmed account has been removed': 'confirmEmail.declined',
  'this email address is already confirmed': 'confirmEmail.alreadyConfirmed',
  'this plan does not require payment': 'subscriptions.paymentNotRequired',
  'upload failed before analysis could be queued': 'api.analysisQueueUnavailable',
  'user email address was confirmed': 'confirmEmail.success',
  'verified payment amount or currency did not match the order': 'subscriptions.paymentAmountMismatch',
  'video metadata extracted': 'dynamic.videoMetadataExtracted',
  'video thumbnail generated': 'dynamic.videoThumbnailGenerated',
  'waiting for processing worker': 'processing.waitingWorker',
  'waiting for reanalysis worker': 'dynamic.waitingReanalysisWorker',
  'waiting for retry worker': 'dynamic.waitingRetryWorker',
}

function normalizeDisplayText(value: string) {
  return value.trim().toLowerCase().replace(/[.!؟?]+$/g, '').replace(/[,:;]/g, '')
}

function localizeScanModeLabel(value: string, t: Translate) {
  const normalized = normalizeDisplayText(value)
  if (normalized === 'basic' || normalized === 'smart' || normalized === 'smart scan') {
    return t('processing.scanTypeSmart')
  }
  if (normalized === 'detailed' || normalized === 'detailed scan') {
    return t('processing.scanTypeDetailed')
  }

  return value.trim()
}

function localizeCheckpoint(value: string, t: Translate) {
  const normalized = normalizeDisplayText(value)
  if (normalized.includes('metadata extraction')) return t('dynamic.checkpointMetadata')
  if (normalized.includes('thumbnail generation')) return t('dynamic.checkpointThumbnail')
  if (normalized.includes('frame extraction')) return t('dynamic.checkpointFrames')
  if (normalized.includes('scan segment')) return t('dynamic.checkpointSegments')
  if (normalized.includes('provider request') || normalized.includes('provider response')) return t('dynamic.checkpointProvider')
  if (normalized.includes('final score calculation') || normalized.includes('saving ai result') || normalized.includes('evidence generation')) return t('dynamic.checkpointFinalResult')
  if (normalized.includes('internal frame matching') || normalized.includes('frame hash generation')) return t('dynamic.checkpointInternalMatching')
  if (normalized.includes('marking completed')) return t('dynamic.checkpointCompletion')
  if (normalized.includes('preparing source video') || normalized.includes('starting analysis')) return t('dynamic.checkpointPreparing')

  return value.trim()
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
