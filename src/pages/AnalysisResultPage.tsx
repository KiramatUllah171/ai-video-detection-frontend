import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { claimGuestVideo, downloadAnalysisReport, getAnalysisResult, getApiErrorMessage, getOriginMatches, getVideoMetadata } from '../api/client'
import type { AnalysisResult, EvidenceItem, MetadataResult, SourceMatch } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdminRole } from '../auth/roleUtils'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, AlertCircleIcon, FileVideoIcon, ShieldIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'
import { formatLocalizedDateShort, formatLocalizedDateTime } from '../i18n/formatDate'
import { getGuestVideoToken, removeGuestVideoAccess } from '../guest/guestVideoAccess'
import { fromVideoRouteId } from '../routes/videoRouteId'

export function AnalysisResultPage() {
  const auth = useAuth()
  const { videoId: routeVideoId } = useParams()
  const videoId = fromVideoRouteId(routeVideoId)
  const { language, t } = useLanguage()
  const isAdmin = isAdminRole(auth.user?.role)
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)
  const guestAccessToken = getGuestVideoToken(videoId)
  const claimQuery = useQuery({
    queryKey: ['guest-video-claim', videoId],
    enabled: Boolean(auth.isAuthenticated && videoId && guestAccessToken),
    retry: false,
    queryFn: async () => {
      await claimGuestVideo(videoId!, guestAccessToken!)
      removeGuestVideoAccess(videoId)
      return true
    },
  })
  const waitingForGuestClaim = Boolean(auth.isAuthenticated && videoId && guestAccessToken && !claimQuery.isSuccess)
  const analysisQuery = useQuery({
    queryKey: ['analysis-result', videoId],
    enabled: Boolean(videoId && !waitingForGuestClaim),
    queryFn: () => getAnalysisResult(videoId!),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const matchesQuery = useQuery({
    queryKey: ['origin-matches', videoId],
    enabled: Boolean(videoId && !waitingForGuestClaim),
    queryFn: () => getOriginMatches(videoId!),
  })
  const metadataQuery = useQuery({
    queryKey: ['video-metadata', videoId],
    enabled: Boolean(videoId && !waitingForGuestClaim),
    queryFn: () => getVideoMetadata(videoId!),
  })

  const analysis = analysisQuery.data ? normalizeAnalysis(analysisQuery.data) : undefined
  const mode = getModelMode(analysis, t)
  const detectorBreakdown = analysis ? parseComponentScores(analysis.componentScoresJson) : undefined
  const matches = matchesQuery.data ?? []

  const handleDownloadReport = async () => {
    if (!videoId || isDownloadingReport) {
      return
    }

    setDownloadError('')
    setIsDownloadingReport(true)
    try {
      const { blob, fileName } = await downloadAnalysisReport(videoId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(getApiErrorMessage(error, t))
    } finally {
      setIsDownloadingReport(false)
    }
  }

  return (
    <main className="page analysis-page">
      <PageHeader
        eyebrow={t('analysis.eyebrow')}
        title={t('analysis.title')}
        subtitle={t('analysis.subtitle')}
        action={(
          <div className="analysis-header-actions">
            {analysis && (
              <button type="button" className={buttonClassName('primary')} onClick={handleDownloadReport} disabled={isDownloadingReport}>
                <FileVideoIcon />
                {isDownloadingReport ? t('analysis.downloadingReport') : t('analysis.downloadPdfReport')}
              </button>
            )}
            <Link className={buttonClassName('outline')} to="/dashboard">{t('analysis.backDashboard')}</Link>
          </div>
        )}
      />

      {waitingForGuestClaim && !claimQuery.error && <LoadingState text={t('guest.linkingResult')} />}
      {claimQuery.error && <ErrorMessage message={getApiErrorMessage(claimQuery.error, t)} />}
      {analysisQuery.isLoading && !waitingForGuestClaim && <LoadingState text={t('analysis.loading')} />}
      {analysisQuery.error && <ErrorMessage message={getApiErrorMessage(analysisQuery.error, t)} />}
      {downloadError && <ErrorMessage message={downloadError} />}

      {analysis && (
        <>
          <section className="result-grid">
            <MetricCard label={t('analysis.aiProbability')} value={`${formatPercent(analysis.aiGeneratedProbability)}%`} icon={<AlertCircleIcon />} isMock={analysis.isMock} showMockBadge={isAdmin} />
            <MetricCard label={t('analysis.realProbability')} value={`${formatPercent(analysis.likelyRealProbability)}%`} icon={<ShieldIcon />} isMock={analysis.isMock} showMockBadge={isAdmin} />
            <MetricCard label={t('analysis.confidence')} value={`${formatPercent(analysis.confidencePercentage)}%`} icon={<ActivityIcon />} isMock={analysis.isMock} showMockBadge={isAdmin} />
          </section>

          <AppCard className={`analysis-section probability-section ${analysis.label === 'Inconclusive' ? 'analysis-section-neutral' : ''}`}>
            <div className="card-header compact">
              <div>
                <h2>{t('analysis.probabilityBalance')}</h2>
                <p>{t('analysis.probabilitySubtitle')}</p>
              </div>
            </div>
            <ProbabilityBalance analysis={analysis} />
          </AppCard>

          <section className="analysis-advanced-toggle">
            <button type="button" className={`${buttonClassName('outline')} technical-details-pulse ${getTechnicalDetailsPulseClass(analysis)}`} onClick={() => setShowAdvancedDetails((current) => !current)}>
              {showAdvancedDetails
                ? t(isAdmin ? 'analysis.hideTechnicalDetails' : 'analysis.hideReviewDetails')
                : t(isAdmin ? 'analysis.showTechnicalDetails' : 'analysis.showReviewDetails')}
            </button>
            <p>{t(isAdmin ? 'analysis.technicalDetailsHelper' : 'analysis.reviewDetailsHelper')} {t(isAdmin ? 'retention.technicalNotice' : 'retention.reviewNotice')}</p>
          </section>

          {showAdvancedDetails && (
            <UserReportSummary analysis={analysis} matches={matches} matchesLoading={matchesQuery.isLoading} />
          )}

          {showAdvancedDetails && isAdmin && (
          <AppCard className="analysis-section">
            <div className="card-header compact">
              <div>
                <h2>{t('analysis.runDetails')}</h2>
                <p>{t('analysis.runDetailsSubtitle')}</p>
              </div>
            </div>
            <div className="detector-breakdown">
              <div className="detector-card">
                <span>{t('analysis.modelMode')}</span>
                <strong>{mode}</strong>
                <small>{t('analysis.resultGeneratedAt', { date: formatLocalizedDateTime(analysis.createdAt, language, t('analysis.dateUnavailable')) })}</small>
              </div>
              <div className="detector-card">
                <span>{t('analysis.modelVersion')}</span>
                <strong>{formatModelDisplay(analysis.modelVersion, t)}</strong>
                <small>{t('analysis.technicalOnly')}</small>
              </div>
            </div>
          </AppCard>
          )}

          {showAdvancedDetails && isAdmin && detectorBreakdown && (
            <AppCard className="analysis-section">
              <div className="card-header compact">
                <div>
                  <h2>{t('analysis.detectorBreakdown')}</h2>
                  <p>{t('analysis.detectorBreakdownSubtitle')}</p>
                </div>
              </div>
              <div className="detector-breakdown">
                <DetectorScore title={t('analysis.videoDetector')} component={detectorBreakdown.video} />
                <DetectorScore title={t('analysis.frameDetector')} component={detectorBreakdown.frame} />
                <div className="detector-card detector-card-combined">
                  <span>{t('analysis.combinedScore')}</span>
                  <strong>{formatPercent((detectorBreakdown.combined?.adjusted_score ?? analysis.finalScore) * 100)}% {t('analysis.aiSuffix')}</strong>
                  {detectorBreakdown.combined?.weighted_average !== undefined && (
                    <small>{t('analysis.weightedAverage', { score: formatPercent(detectorBreakdown.combined.weighted_average * 100) })}</small>
                  )}
                  {analysis.minimumRecommendedScore !== undefined && analysis.minimumRecommendedScore !== null && (
                    <small>{t('analysis.adjustedMinimum', { score: formatPercent(analysis.minimumRecommendedScore * 100) })}</small>
                  )}
                  {analysis.ensembleStrategy && <small>{t('analysis.strategy', { strategy: formatWords(analysis.ensembleStrategy, t) })}</small>}
                </div>
              </div>
            </AppCard>
          )}

          {showAdvancedDetails && isAdmin && (
          <AppCard className="analysis-section">
            <div className="card-header compact">
              <div>
                <h2>{t('processing.scanType')}</h2>
                <p>{formatScanModeDisplay(analysis.scanMode ?? analysis.providerMode, t)}</p>
              </div>
            </div>
            <div className="detector-breakdown">
              <div className="detector-card">
                <span>{t('processing.scanType')}</span>
                <strong>{formatScanModeDisplay(analysis.scanMode ?? analysis.providerMode, t)}</strong>
                <small>{getScanModeDescription(analysis.scanMode ?? analysis.providerMode, t)}</small>
              </div>
            </div>
          </AppCard>
          )}

          {showAdvancedDetails && (
          <section className="content-grid">
            <AppCard className="analysis-section span-8">
              <div className="card-header compact">
                <div>
                  <h2>{t('analysis.scoreBreakdown')}</h2>
                  <p>{t('analysis.scoreBreakdownSubtitle')}</p>
                </div>
              </div>
              <ScoreBar label={t('analysis.visualScore')} value={analysis.visualScore} />
              <ScoreBar label={t('analysis.metadataScore')} value={analysis.metadataScore} />
              <ScoreBar label={t('analysis.temporalScore')} value={analysis.temporalScore} emptyLabel={t('analysis.notAvailable')} />
              <ScoreBar label={t('analysis.finalWeightedScore')} value={analysis.finalScore} />
            </AppCard>

            <AppCard className="analysis-section span-4">
              <div className="card-header compact">
                <div>
                  <h2>{t('analysis.metadataSummary')}</h2>
                  <p>{t('analysis.metadataSubtitle')}</p>
                </div>
              </div>
              <MetadataSummary metadata={metadataQuery.data} />
            </AppCard>
          </section>
          )}

          {showAdvancedDetails && isAdmin && (
          <AppCard className="analysis-section">
            <div className="card-header compact">
              <div>
                <h2>{t('analysis.evidence')}</h2>
                <p>{t('analysis.evidenceSubtitle')}</p>
              </div>
            </div>
            <EvidenceGroups evidence={analysis.evidenceItems} warnings={analysis.warnings} isMock={analysis.isMock} />
          </AppCard>
          )}

          {showAdvancedDetails && (
          <AppCard className="analysis-section">
            <div className="card-header compact">
              <div>
                <h2>{t('analysis.originTracking')}</h2>
                <p>{t('analysis.originSubtitle')}</p>
              </div>
            </div>
            <OriginMatches matches={matches} loading={matchesQuery.isLoading} />
          </AppCard>
          )}
        </>
      )}
    </main>
  )
}

function MetricCard({ label, value, icon, isMock = false, showMockBadge = false }: { label: string; value: string; icon: ReactNode; isMock?: boolean; showMockBadge?: boolean }) {
  const { t } = useLanguage()
  return (
    <AppCard className={`result-metric ${isMock ? 'result-metric-mock' : ''}`}>
      <span>{icon}</span>
      {isMock && showMockBadge && <em>{t('analysis.mock')}</em>}
      <small>{label}</small>
      <strong>{value}</strong>
    </AppCard>
  )
}

function UserReportSummary({ analysis, matches, matchesLoading }: { analysis: AnalysisResult; matches: SourceMatch[]; matchesLoading: boolean }) {
  const { t } = useLanguage()
  const topMatch = matches[0]
  const hasMatch = Boolean(topMatch)
  const aiProbability = formatPercent(analysis.aiGeneratedProbability)
  const realProbability = formatPercent(analysis.likelyRealProbability)
  const confidence = formatPercent(analysis.confidencePercentage)

  return (
    <AppCard className="analysis-user-summary">
      <div className="card-header compact">
        <div>
          <h2>{t('analysis.userSummaryTitle')}</h2>
          <p>{t('analysis.userSummarySubtitle')}</p>
        </div>
      </div>
      <div className="user-summary-grid">
        <div className="user-summary-verdict">
          <span>{t('analysis.finalVerdict')}</span>
          <strong>{localizeLabel(analysis.label, t)}</strong>
          <p>{getPlainResultExplanation(analysis, t)}</p>
        </div>
        <div className="user-summary-list">
          <SummaryPoint
            title={t('analysis.aiChanceTitle')}
            text={t('analysis.aiChanceText', { ai: aiProbability, real: realProbability })}
          />
          <SummaryPoint
            title={t('analysis.confidenceTitle')}
            text={getConfidenceExplanation(analysis, confidence, t)}
          />
          <SummaryPoint
            title={t('analysis.originSimpleTitle')}
            text={matchesLoading ? t('analysis.originCheckingSimple') : getOriginExplanation(topMatch, t)}
          />
        </div>
      </div>
      <div className="analysis-next-step">
        <strong>{t('analysis.recommendedAction')}</strong>
        <p>{getRecommendedAction(analysis, hasMatch, t)}</p>
      </div>
    </AppCard>
  )
}

function SummaryPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="summary-point">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function getTechnicalDetailsPulseClass(analysis: AnalysisResult) {
  const tone = getResultTone(analysis)
  if (tone === 'ai') {
    return 'technical-details-pulse-ai'
  }
  if (tone === 'neutral') {
    return 'technical-details-pulse-neutral'
  }

  return 'technical-details-pulse-real'
}

function ProbabilityBalance({ analysis }: { analysis: AnalysisResult }) {
  const { t } = useLanguage()
  const realPercent = Math.max(0, Math.min(100, analysis.likelyRealProbability))
  const aiPercent = Math.max(0, Math.min(100, analysis.aiGeneratedProbability))
  const cautiousLabel = analysis.label === 'Inconclusive' || analysis.modelDisagreement
  const realLabel = `${cautiousLabel ? t('analysis.estimatedReal') : t('analysis.likelyReal')} ${formatPercent(realPercent)}%`
  const aiLabel = `${cautiousLabel ? t('analysis.estimatedAi') : t('analysis.aiManipulated')} ${formatPercent(aiPercent)}%`
  const resultTone = getResultTone(analysis)
  const riskPercent = aiPercent
  const circumference = 2 * Math.PI * 54
  const strokeOffset = circumference - (riskPercent / 100) * circumference

  return (
    <div className={`probability-balance probability-balance-${resultTone}`}>
      <div className="mobile-probability-result" aria-label={`${localizeLabel(analysis.label, t)}. ${t('analysis.aiProbability')} ${formatPercent(riskPercent)}%. ${realLabel}. ${aiLabel}.`}>
        <div className="mobile-result-pill">
          <span />
          {localizeLabel(analysis.label, t)}
        </div>
        <div className="mobile-result-ring">
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <circle className="mobile-result-track" cx="64" cy="64" r="54" />
            <circle
              className="mobile-result-progress"
              cx="64"
              cy="64"
              r="54"
              pathLength={circumference}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>
          <div className="mobile-result-center">
            <span>{t('analysis.mobileResultAi')}</span>
            <strong>{formatPercent(riskPercent)}%</strong>
            <small>{localizeLabel(analysis.label, t)}</small>
          </div>
        </div>
        <div className="mobile-result-balance">
          <span>{realLabel}</span>
          <span>{aiLabel}</span>
        </div>
      </div>
      <div className="desktop-probability-balance">
        <div className="split-probability" aria-label={`${realLabel}. ${aiLabel}.`}>
          <div
            className={realPercent < 12 ? 'is-small' : ''}
            style={{ width: `${realPercent}%` }}
            title={realLabel}
          >
            <span>{realLabel}</span>
          </div>
          <div
            className={aiPercent < 12 ? 'is-small' : ''}
            style={{ width: `${aiPercent}%` }}
            title={aiLabel}
          >
            <span>{aiLabel}</span>
          </div>
        </div>
        <div className="probability-legend">
          <span className="probability-legend-real">{realLabel}</span>
          <span className="probability-legend-ai">{aiLabel}</span>
        </div>
      </div>
    </div>
  )
}

function getResultTone(analysis: AnalysisResult) {
  const normalized = (analysis.label ?? '').toLowerCase().replace(/\s+/g, '')
  if (normalized === 'inconclusive' || analysis.modelDisagreement) {
    return 'neutral'
  }
  if (normalized === 'likelyaigenerated' || normalized === 'suspicious' || analysis.aiGeneratedProbability > analysis.likelyRealProbability) {
    return 'ai'
  }

  return 'real'
}

function WarningPanel({ message, subtle = false, strong = false }: { message: string; subtle?: boolean; strong?: boolean }) {
  return (
    <div className={`analysis-warning ${subtle ? 'analysis-warning-subtle' : ''} ${strong ? 'analysis-warning-strong' : ''}`}>
      <AlertCircleIcon />
      <span>{message}</span>
    </div>
  )
}

function DetectorScore({ title, component }: { title: string; component?: DetectorComponent }) {
  const { t } = useLanguage()
  if (!component) {
    return (
      <div className="detector-card">
        <span>{title}</span>
        <strong>{t('analysis.unavailable')}</strong>
      </div>
    )
  }

  return (
    <div className="detector-card">
      <span>{title}</span>
      <strong>{formatPercent(component.ai_score * 100)}% {t('analysis.aiSuffix')}</strong>
      {component.raw_frame_ai_score !== undefined && (
        <small>{t('analysis.rawFrameScore', { raw: formatPercent(component.raw_frame_ai_score * 100), calibrated: formatPercent((component.calibrated_frame_ai_score ?? component.ai_score) * 100) })}</small>
      )}
      <small>{component.model_id}</small>
      <small>{t('analysis.confidenceInline', { capability: formatWords(component.model_capability, t), confidence: formatPercent(component.confidence * 100) })}</small>
      {component.reliability?.accuracy !== undefined && (
        <small>{t('analysis.reliability', { accuracy: formatPercent(component.reliability.accuracy * 100), samples: component.reliability.sample_count ?? 0 })}</small>
      )}
    </div>
  )
}

function ScoreBar({ label, value, emptyLabel }: { label: string; value?: number; emptyLabel?: string }) {
  const { t } = useLanguage()
  const percent = typeof value === 'number' ? Math.max(0, Math.min(100, value * 100)) : undefined
  return (
    <div className="score-row">
      <div>
        <span>{label}</span>
        <strong>{percent === undefined ? emptyLabel ?? t('analysis.noSignal') : `${formatPercent(percent)}%`}</strong>
      </div>
      <div className="score-track">
        <span style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  )
}

function EvidenceGroups({ evidence, warnings, isMock }: { evidence: EvidenceItem[]; warnings: string[]; isMock: boolean }) {
  const { t } = useLanguage()
  const groups = [
    [isMock ? t('analysis.mockFrameGroup') : t('analysis.aiFrameGroup'), evidence.filter((item) => item.type === 'AiFrameScore')],
    [t('analysis.metadataWarnings'), evidence.filter((item) => item.type === 'MetadataWarning')],
    [t('analysis.systemNotes'), evidence.filter((item) => item.type !== 'AiFrameScore' && item.type !== 'MetadataWarning')],
  ] as const

  return (
    <div className="evidence-groups">
      {warnings.length > 0 && <WarningPanel message={warnings.map((warning) => localizeKnownMessage(warning, t)).join(' ')} subtle />}
      {isMock && (
        <p className="mock-helper-copy">
          {t('analysis.mockHelper')}
        </p>
      )}
      {groups.map(([title, items]) => (
        <div className="evidence-group" key={title}>
          <h3>{title}</h3>
          {items.length === 0 ? (
            <p className="muted-copy">{t('analysis.noItems')}</p>
          ) : (
            <div className="evidence-list">
              {items.map((item) => (
                <div className="evidence-card" key={item.id}>
                  <div>
                    <StatusBadge status={item.severity} />
                    <strong>{localizeEvidenceTitle(item.title, isMock, t)}</strong>
                    <p>{localizeKnownMessage(item.description, t)}</p>
                  </div>
                  <small>
                    {isFiniteNumber(item.timestampSeconds) ? `${item.timestampSeconds.toFixed(2)}s` : t('analysis.noTimestamp')}
                    {isFiniteNumber(item.scoreImpact) ? ` - ${t('analysis.impact', { impact: item.scoreImpact.toFixed(2) })}` : ''}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function MetadataSummary({ metadata }: { metadata?: MetadataResult }) {
  const { t } = useLanguage()
  if (!metadata) {
    return <p className="muted-copy">{t('analysis.metadataUnavailable')}</p>
  }

  const rows = [
    [t('analysis.duration'), metadata.durationSeconds ? `${metadata.durationSeconds.toFixed(2)}s` : undefined],
    [t('analysis.resolution'), metadata.resolution],
    [t('analysis.fps'), metadata.fps?.toString()],
    [t('analysis.codec'), metadata.codec],
    [t('analysis.audio'), metadata.audioCodec],
    [t('analysis.bitrate'), metadata.bitrate?.toLocaleString()],
  ]

  return (
    <div className="metadata-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value ?? t('analysis.unknown')}</strong>
        </div>
      ))}
    </div>
  )
}

function OriginMatches({ matches, loading }: { matches: SourceMatch[]; loading: boolean }) {
  const { language, t } = useLanguage()
  if (loading) {
    return <LoadingState text={t('analysis.checkingMatches')} />
  }

  if (matches.length === 0) {
    return <EmptyState icon={<FileVideoIcon />} title={t('analysis.noMatchesTitle')} description={t('analysis.noMatchesDescription')} />
  }

  return (
    <div className="match-list">
      {matches.map((match) => (
        <div className="match-card" key={match.id}>
          <div>
            <strong>{localizeOriginMatchTitle(match, t)}</strong>
            <span>{t('analysis.confidenceInline', { capability: localizePlatform(match.platform, t), confidence: localizeConfidence(match.confidence, t) })}</span>
          </div>
          <div>
            <strong>{formatPercent(match.similarityScore * 100)}%</strong>
            <span>{formatLocalizedDateShort(match.uploadDatetime, language, t('analysis.dateUnavailable'))}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function getModelMode(analysis: AnalysisResult | undefined, t: ReturnType<typeof useLanguage>['t']) {
  if (!analysis) return t('analysis.unknownModel')
  if (analysis.isMock) return t('analysis.modelMock')
  if (analysis.modelCapability === 'ensemble_video_frame') return t('analysis.modelEnsemble')
  if (analysis.modelCapability === 'frame_image') return t('analysis.modelFrame')
  if (analysis.modelCapability === 'video_temporal') return t('analysis.modelTemporal')
  return t('analysis.modelAi')
}

function localizeOriginMatchTitle(match: SourceMatch, t: ReturnType<typeof useLanguage>['t']) {
  const title = match.title?.trim()
  if (!title) {
    return `#${match.rank} ${t('analysis.internalMatch')}`
  }

  const knownMatch = title.match(/^Previously analyzed internal video #(\d+)$/i)
  if (knownMatch) {
    return t('analysis.previouslyAnalyzedVideo', { rank: knownMatch[1] })
  }

  return `#${match.rank} ${title}`
}

function localizePlatform(platform: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  if (!platform) return t('analysis.unknown')
  const normalized = platform.toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'internal') return t('analysis.internalPlatform')
  if (normalized === 'local') return t('analysis.internalVerification')
  if (normalized === 'smartscan') return t('processing.scanTypeSmart')
  if (normalized.includes('external')) return t('analysis.externalVerification')
  return platform
}

function localizeConfidence(confidence: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = confidence?.toLowerCase()
  if (normalized === 'high') return t('status.high')
  if (normalized === 'medium') return t('status.medium')
  if (normalized === 'low') return t('status.low')
  return confidence ?? t('analysis.unknown')
}

function getPlainResultExplanation(analysis: AnalysisResult, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (analysis.label ?? '').toLowerCase().replace(/\s+/g, '')
  if (analysis.isMock) {
    return t('analysis.simpleMockExplanation')
  }
  if (normalized === 'likelyreal') {
    return t('analysis.simpleLikelyRealExplanation')
  }
  if (normalized === 'likelyaigenerated') {
    return t('analysis.simpleLikelyAiExplanation')
  }
  if (normalized === 'suspicious') {
    return t('analysis.simpleSuspiciousExplanation')
  }
  return t('analysis.simpleInconclusiveExplanation')
}

function getConfidenceExplanation(analysis: AnalysisResult, confidence: string, t: ReturnType<typeof useLanguage>['t']) {
  if (analysis.confidencePercentage >= 75) {
    return t('analysis.confidenceHighSimple', { confidence })
  }
  if (analysis.confidencePercentage >= 45) {
    return t('analysis.confidenceMediumSimple', { confidence })
  }
  return t('analysis.confidenceLowSimple', { confidence })
}

function getOriginExplanation(match: SourceMatch | undefined, t: ReturnType<typeof useLanguage>['t']) {
  if (!match) {
    return t('analysis.originNoMatchSimple')
  }

  return t('analysis.originMatchSimple', {
    similarity: formatPercent(match.similarityScore * 100),
    confidence: localizeConfidence(match.confidence, t),
  })
}

function getRecommendedAction(analysis: AnalysisResult, hasMatch: boolean, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (analysis.label ?? '').toLowerCase().replace(/\s+/g, '')
  if (analysis.isMock) {
    return t('analysis.actionMock')
  }
  if (normalized === 'likelyreal' && !hasMatch) {
    return t('analysis.actionLikelyReal')
  }
  if (normalized === 'likelyreal' && hasMatch) {
    return t('analysis.actionLikelyRealWithMatch')
  }
  if (normalized === 'likelyaigenerated') {
    return t('analysis.actionLikelyAi')
  }
  if (normalized === 'suspicious') {
    return t('analysis.actionSuspicious')
  }
  return t('analysis.actionInconclusive')
}

function normalizeAnalysis(analysis: AnalysisResult): AnalysisResult {
  const finalScore = safeNumber(analysis.finalScore, 0)
  const confidence = safeNumber(analysis.confidence, 0)

  return {
    ...analysis,
    isMock: Boolean(analysis.isMock),
    modelCapability: analysis.modelCapability ?? 'unknown',
    aiGeneratedProbability: safeNumber(analysis.aiGeneratedProbability, finalScore * 100),
    likelyRealProbability: safeNumber(analysis.likelyRealProbability, (1 - finalScore) * 100),
    confidencePercentage: safeNumber(analysis.confidencePercentage, confidence * 100),
    visualScore: safeNumber(analysis.visualScore, finalScore),
    metadataScore: optionalNumber(analysis.metadataScore),
    temporalScore: optionalNumber(analysis.temporalScore),
    finalScore,
    confidence,
    summary: analysis.summary ?? '',
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
    provider: analysis.provider ?? 'Local',
    providerMode: analysis.providerMode ?? 'local',
    scanMode: analysis.scanMode,
    finalDecisionSource: analysis.finalDecisionSource ?? 'Local',
    fallbackUsed: Boolean(analysis.fallbackUsed),
    providerWarnings: Array.isArray(analysis.providerWarnings) ? analysis.providerWarnings : [],
    modelDisagreement: Boolean(analysis.modelDisagreement),
    strongFrameEvidence: Boolean(analysis.strongFrameEvidence),
    minimumRecommendedScore: optionalNumber(analysis.minimumRecommendedScore),
    ensembleStrategy: analysis.ensembleStrategy,
    componentScoresJson: analysis.componentScoresJson,
    evidenceItems: Array.isArray(analysis.evidenceItems) ? analysis.evidenceItems : [],
  }
}

type DetectorComponent = {
  model_id: string
  model_capability: string
  ai_score: number
  real_probability: number
  confidence: number
  raw_frame_ai_score?: number
  calibrated_frame_ai_score?: number
  reliability?: {
    sample_count?: number
    accuracy?: number
    average_real_score?: number
    average_ai_score?: number
  }
}

type DetectorBreakdown = {
  video?: DetectorComponent
  frame?: DetectorComponent
  combined?: {
    weighted_average?: number
    adjusted_score?: number
    minimum_recommended_score?: number
    strategy?: string
  }
}

function parseComponentScores(raw?: string): DetectorBreakdown | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as DetectorBreakdown
    if (!parsed.video && !parsed.frame && !parsed.combined) return undefined
    return parsed
  } catch {
    return undefined
  }
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatLabel(label: string) {
  return (label || 'Inconclusive').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function localizeLabel(label: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (label || 'Inconclusive').toLowerCase().replace(/\s+/g, '')
  const map: Record<string, ReturnType<typeof useLanguage>['t'] extends (key: infer K, values?: Record<string, string | number>) => string ? K & string : never> = {
    likelyreal: 'status.likelyreal',
    likelyaigenerated: 'status.likelyaigenerated',
    suspicious: 'status.suspicious',
    inconclusive: 'status.inconclusive',
    completed: 'status.completed',
    failed: 'status.failed',
    processing: 'status.processing',
    queued: 'status.queued',
    high: 'status.high',
    medium: 'status.medium',
    low: 'status.low',
  }
  const key = map[normalized]
  return key ? t(key) : formatLabel(label || 'Inconclusive')
}

function localizeEvidenceTitle(title: string, isMock: boolean, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = title.trim().toLowerCase()
  if (normalized === 'missing creation time') return t('analysis.missingCreationTimeTitle')
  if (normalized === 'missing encoder metadata') return t('analysis.missingEncoderTitle')
  if (normalized === 'no audio stream detected') return `${t('analysis.audio')} ${t('analysis.notAvailable')}`
  if (normalized === 'heavy compression indicator') return `${t('analysis.bitrate')} ${t('status.low')}`
  if (normalized === 'incomplete core metadata') return t('analysis.metadataUnavailable')
  if (normalized === 'unreadable metadata') return t('analysis.metadataUnavailable')
  if (normalized === 'limited confidence') return t('analysis.limitedConfidenceTitle')
  if (normalized === 'metadata warning') return t('analysis.metadataWarningTitle')
  if (normalized === 'mock ai service result') return t('analysis.mockAiServiceResultTitle')
  if (normalized === 'detector disagreement') return t('analysis.disagreementWarning')
  if (normalized === 'low confidence result') return t('analysis.lowConfidenceWarning')
  if (normalized === 'external provider notice') return t('analysis.defaultSummary')
  if (normalized === 'high ai indicator frame') return t('analysis.highAiIndicatorFrameTitle')
  if (normalized === 'moderate ai indicator frame') return t('analysis.moderateAiIndicatorFrameTitle')
  if (isMock && normalized === 'mock high-score frame') return t('analysis.mockHighScoreFrameTitle')
  if (isMock && normalized === 'mock moderate-score frame') return t('analysis.mockModerateScoreFrameTitle')
  if (isMock && normalized === 'high ai indicator frame') return `${t('analysis.mock')} ${t('status.high')}`
  if (isMock && normalized === 'moderate ai indicator frame') return `${t('analysis.mock')} ${t('status.medium')}`
  if (isMock && normalized === 'ai frame indicator') return t('analysis.mockFrameGroup')
  return title
}

function localizeKnownMessage(message: string, t: ReturnType<typeof useLanguage>['t']) {
  const trimmed = message.trim()
  const frameScoreMatch = trimmed.match(/^Frame\s+(\d+)\s+at\s+([0-9.]+)s\s+returned score\s+([0-9.]+)\s+with confidence\s+([0-9.]+)\.?$/i)
  if (frameScoreMatch) {
    return t('dynamic.frameScoreDescription', {
      frame: frameScoreMatch[1],
      timestamp: frameScoreMatch[2],
      score: frameScoreMatch[3],
      confidence: frameScoreMatch[4],
    })
  }

  const direct = localizeKnownSentence(trimmed, t)
  if (direct) {
    return direct
  }

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  if (!sentences || sentences.length <= 1) {
    return sanitizeDisplayMessage(message, t)
  }

  return sentences
    .map((sentence) => {
      const cleanSentence = sentence.trim()
      return localizeKnownSentence(cleanSentence, t) ?? sanitizeDisplayMessage(cleanSentence, t)
    })
    .join(' ')
}

function localizeKnownSentence(message: string, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = message.trim().toLowerCase().replace(/[.!؟]+$/g, '')
  if (normalized.includes('provider authentication failed')) {
    return t('analysis.defaultSummary')
  }
  if (
    normalized === 'the available evidence suggests this video is likely real' ||
    normalized === 'the available evidence suggests this video is likely real.'
  ) {
    return t('analysis.simpleLikelyRealExplanation')
  }
  if (
    normalized === 'the available evidence suggests this video is likely ai-generated' ||
    normalized === 'the available evidence suggests this video is likely ai-generated.' ||
    normalized === 'the available evidence suggests this video is likely ai generated'
  ) {
    return t('analysis.simpleLikelyAiExplanation')
  }
  if (
    normalized === 'review the evidence before making a decision' ||
    normalized === 'review the evidence before making a decision.'
  ) {
    return t('analysis.actionSuspicious')
  }
  if (normalized === 'this video may be processed by an external ai detection provider for analysis') {
    return t('analysis.defaultSummary')
  }
  if (normalized === 'the video metadata does not include a creation timestamp') {
    return t('analysis.missingCreationTimeDescription')
  }
  if (normalized === 'the video metadata does not identify the encoder') {
    return t('analysis.missingEncoderDescription')
  }
  if (normalized.includes('this result is probability-based and generated using the current ai service output')) {
    return t('analysis.defaultSummary')
  }
  if (normalized.includes('this is not a guarantee of authenticity or origin')) {
    return t('analysis.proofWarning')
  }
  if (
    normalized.includes('development mock model was used') ||
    normalized.includes('mock model was used') ||
    normalized.includes('this is a mock ai response') ||
    normalized.includes('do not treat this result as real ai detection')
  ) {
    return t('analysis.mockWarning')
  }
  if (normalized.includes('mock score generated from deterministic frame identifier hash')) {
    return t('analysis.mockHelper')
  }
  if (
    normalized.includes('frame-level model used') ||
    normalized.includes('temporal video consistency') ||
    normalized.includes('frame-level model helps detect visual artifacts')
  ) {
    return t('analysis.frameWarning')
  }
  if (normalized.includes('model components disagree')) {
    return t('analysis.disagreementWarning')
  }
  if (
    normalized.includes('frame-level detector found strong ai-like visual signals') ||
    normalized.includes('frame detector found ai-like visual signals')
  ) {
    return t('analysis.strongFrameWarning')
  }
  if (normalized.includes('frame detector gave high scores')) {
    return t('analysis.inconclusiveWarning')
  }
  if (normalized.includes('temporal detector found suspicious sequence-level signals')) {
    return t('analysis.suspiciousWarning')
  }
  if (
    normalized.includes('primary video detector model was not available') ||
    normalized.includes('frame-level detector model was not available') ||
    normalized.includes('frame detector unavailable') ||
    normalized.includes('only one detector model was available') ||
    normalized.includes('no detector model is available')
  ) {
    return t('analysis.defaultSummary')
  }
  if (normalized.includes('local and bitmind providers disagree')) {
    return t('analysis.disagreementWarning')
  }
  if (normalized.includes('bitmind detected ai-like signals')) {
    return t('analysis.suspiciousWarning')
  }
  if (normalized.includes('compressed analysis copy') && normalized.includes('bitmind')) {
    return t('analysis.defaultSummary')
  }
  if (
    normalized.includes('calibration report has too few samples') ||
    normalized.includes('detector was down-weighted by calibration reliability checks')
  ) {
    return t('analysis.lowConfidenceWarning')
  }
  if (normalized.includes('frame score combined from available detector models')) {
    return t('analysis.detectorBreakdownSubtitle')
  }
  if (normalized.includes('this analysis was generated by the mock ai service')) {
    return t('analysis.mockWarning')
  }
  if (normalized === 'this is a probability-based analysis.' || normalized === 'this is a probability-based ensemble analysis.') {
    return t('analysis.defaultSummary')
  }
  if (normalized === 'the video metadata does not include a creation timestamp.') {
    return t('analysis.missingCreationTimeDescription')
  }
  if (normalized === 'the video metadata does not identify the encoder.') {
    return t('analysis.missingEncoderDescription')
  }
  if (normalized === 'no audio stream was detected in the media metadata.') {
    return `${t('analysis.audio')}: ${t('analysis.notAvailable')}`
  }
  if (normalized === 'the media bitrate appears unusually low for the available metadata.') {
    return `${t('analysis.bitrate')}: ${t('status.low')}`
  }
  if (
    normalized === 'some core media metadata could not be read.' ||
    normalized === 'the media metadata could not be read reliably.' ||
    normalized === 'missing_core_metadata' ||
    normalized === 'unreadable_metadata'
  ) {
    return t('analysis.metadataUnavailable')
  }
  if (normalized === 'missing_creation_time') {
    return t('analysis.missingCreationTimeDescription')
  }
  if (normalized === 'missing_encoder') {
    return t('analysis.missingEncoderDescription')
  }
  if (normalized === 'no_audio_stream') {
    return `${t('analysis.audio')}: ${t('analysis.notAvailable')}`
  }
  if (normalized === 'unusually_low_bitrate') {
    return `${t('analysis.bitrate')}: ${t('status.low')}`
  }
  return undefined
}

function formatPercent(value: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(100, numeric)).toFixed(1)
}

function formatWords(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (value ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  if (!normalized) return t('analysis.unknown')
  if (normalized === 'ensemblevideoframe') return t('analysis.modelCapability.ensembleVideoFrame')
  if (normalized === 'frameimage') return t('analysis.modelCapability.frameImage')
  if (normalized === 'videotemporal') return t('analysis.modelCapability.videoTemporal')
  if (normalized === 'representativevideosegments') return t('analysis.modelCapability.representativeVideoSegments')
  if (normalized === 'mock') return t('analysis.modelCapability.mock')
  if (normalized === 'strongframeevidencefloor') return t('analysis.strategy.strongFrameEvidenceFloor')
  if (normalized === 'verystrongframeevidencefloor') return t('analysis.strategy.veryStrongFrameEvidenceFloor')
  return sanitizeDisplayMessage(value ?? t('analysis.unknown'), t).replace(/_/g, ' ')
}

function formatScanModeDisplay(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (value ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized.includes('detailed') || normalized.includes('detail')) {
    return t('processing.scanTypeDetailed')
  }
  if (normalized.includes('smart') || normalized === 'basic') {
    return t('processing.scanTypeSmart')
  }
  return t('processing.scanTypeSmart')
}

function getScanModeDescription(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (value ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  return normalized.includes('detailed') || normalized.includes('detail')
    ? t('upload.detailedDescription')
    : t('upload.smartScanDescription')
}

function formatModelDisplay(value: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  if (!value) {
    return t('analysis.unknownModel')
  }

  return value.toLowerCase().includes('bitmind')
    ? t('analysis.unknownModel')
    : value
}

function sanitizeDisplayMessage(value: string, t?: ReturnType<typeof useLanguage>['t']) {
  const genericModelLabel = t ? t('analysis.modelAi') : 'AI model'
  if (t && containsSensitiveOperationalText(value)) {
    return t('analysis.defaultSummary')
  }

  return value
    .replace(/bitmind-oracle-v1-sn34/gi, genericModelLabel)
    .replace(/bitmind-subnet-34/gi, genericModelLabel)
    .replace(/External\s+BitMind\s+verification/gi, genericModelLabel)
    .replace(/BitMind/gi, genericModelLabel)
}

function containsSensitiveOperationalText(value: string) {
  return /\b(bitmind|external|provider|api|quota|exception|stack|endpoint|database|configured|merchant|callback|signature|subnet|api key|secret)\b/i.test(value)
}
