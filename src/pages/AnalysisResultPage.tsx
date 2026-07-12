import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAnalysisResult, getApiErrorMessage, getOriginMatches, getVideoMetadata } from '../api/client'
import type { AnalysisResult, EvidenceItem, MetadataResult, SourceMatch } from '../api/types'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ActivityIcon, AlertCircleIcon, BarChartIcon, FileVideoIcon, ShieldIcon } from '../components/ui/icons'

export function AnalysisResultPage() {
  const { videoId } = useParams()
  const analysisQuery = useQuery({
    queryKey: ['analysis-result', videoId],
    enabled: Boolean(videoId),
    queryFn: () => getAnalysisResult(videoId!),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const matchesQuery = useQuery({
    queryKey: ['origin-matches', videoId],
    enabled: Boolean(videoId),
    queryFn: () => getOriginMatches(videoId!),
  })
  const metadataQuery = useQuery({
    queryKey: ['video-metadata', videoId],
    enabled: Boolean(videoId),
    queryFn: () => getVideoMetadata(videoId!),
  })

  const analysis = analysisQuery.data ? normalizeAnalysis(analysisQuery.data) : undefined
  const mode = getModelMode(analysis)
  const detectorBreakdown = analysis ? parseComponentScores(analysis.componentScoresJson) : undefined

  return (
    <main className="page analysis-page">
      <PageHeader
        eyebrow="Authenticity result"
        title="Video Analysis Result"
        subtitle="Probability-based authenticity analysis using AI, metadata, and internal matching signals."
        action={<Link className={buttonClassName('outline')} to="/dashboard">Back to Dashboard</Link>}
      />

      {analysisQuery.isLoading && <LoadingState text="Loading analysis result..." />}
      {analysisQuery.error && <ErrorMessage message={getApiErrorMessage(analysisQuery.error)} />}

      {analysis && (
        <>
          <AppCard className="analysis-hero-card">
            <div className="analysis-title-row">
              <div>
                <StatusBadge status={analysis.label} />
                <h2>{formatLabel(analysis.label)}</h2>
                <p>{analysis.summary}</p>
              </div>
              <div className="analysis-meta">
                <span>{mode}</span>
                <strong>{analysis.modelVersion ?? 'Unknown model'}</strong>
                <small>Result #{analysis.aiResultId} - {dayjs(analysis.createdAt).format('MMM D, YYYY h:mm A')}</small>
              </div>
            </div>
            {analysis.isMock && (
              <WarningPanel
                message="Mock result. Do not use this to judge whether the video is real or AI-generated."
                strong
              />
            )}
            {analysis.modelCapability === 'frame_image' && (
              <WarningPanel message="Frame-level model used. This checks individual frames and may miss temporal video artifacts." />
            )}
            {analysis.modelCapability === 'video_temporal' && analysis.confidence < 0.6 && (
              <WarningPanel message="The selected free model produced a low-confidence result. Review evidence and consider additional verification." />
            )}
            {analysis.modelDisagreement && (
              <WarningPanel message="Model components disagree; treat result with caution." />
            )}
            {analysis.strongFrameEvidence && (
              <WarningPanel message="Frame-level detector found strong AI-like visual signals while another detector disagreed." />
            )}
            {analysis.modelDisagreement && detectorBreakdown?.video && detectorBreakdown?.frame && detectorBreakdown.video.ai_score < 0.5 && (detectorBreakdown.frame.raw_frame_ai_score ?? detectorBreakdown.frame.ai_score) >= 0.7 && (
              <WarningPanel message="Frame-level detector produced high scores, but the temporal video detector did not confirm them. The result is inconclusive and should not be treated as evidence of AI generation." />
            )}
            {analysis.label === 'Inconclusive' && (
              <WarningPanel message="Inconclusive - not enough reliable evidence for a strong real/fake label." subtle />
            )}
            <WarningPanel message="This analysis is probability-based and should be reviewed with context. It does not guarantee whether a video is real or AI-generated and should not be treated as legal proof." subtle />
          </AppCard>

          <section className="result-grid">
            <MetricCard label="AI-generated / Manipulated Probability" value={`${formatPercent(analysis.aiGeneratedProbability)}%`} icon={<AlertCircleIcon />} isMock={analysis.isMock} />
            <MetricCard label="Likely Real Probability" value={`${formatPercent(analysis.likelyRealProbability)}%`} icon={<ShieldIcon />} isMock={analysis.isMock} />
            <MetricCard label="Confidence" value={`${formatPercent(analysis.confidencePercentage)}%`} icon={<ActivityIcon />} isMock={analysis.isMock} />
            <MetricCard label="Final Score" value={`${formatPercent(analysis.finalScore * 100)}%`} icon={<BarChartIcon />} isMock={analysis.isMock} />
          </section>

          {detectorBreakdown && (
            <AppCard className="analysis-section">
              <div className="card-header compact">
                <div>
                  <h2>AI Detector Breakdown</h2>
                  <p>Component model estimates used to calculate the ensemble result.</p>
                </div>
              </div>
              <div className="detector-breakdown">
                <DetectorScore title="Video temporal detector" component={detectorBreakdown.video} />
                <DetectorScore title="Frame detector" component={detectorBreakdown.frame} />
                <div className="detector-card detector-card-combined">
                  <span>Combined ensemble score</span>
                  <strong>{formatPercent((detectorBreakdown.combined?.adjusted_score ?? analysis.finalScore) * 100)}% AI</strong>
                  {detectorBreakdown.combined?.weighted_average !== undefined && (
                    <small>Weighted average {formatPercent(detectorBreakdown.combined.weighted_average * 100)}%</small>
                  )}
                  {analysis.minimumRecommendedScore !== undefined && analysis.minimumRecommendedScore !== null && (
                    <small>Adjusted minimum {formatPercent(analysis.minimumRecommendedScore * 100)}% because strong frame evidence was detected.</small>
                  )}
                  {analysis.ensembleStrategy && <small>Strategy: {formatWords(analysis.ensembleStrategy)}</small>}
                </div>
              </div>
            </AppCard>
          )}

          <AppCard className={`analysis-section ${analysis.label === 'Inconclusive' ? 'analysis-section-neutral' : ''}`}>
            <div className="card-header compact">
              <div>
                <h2>Probability Balance</h2>
                <p>These values are model estimates, not proof.</p>
              </div>
            </div>
            <div className="split-probability">
              <div style={{ width: `${Math.max(0, Math.min(100, analysis.likelyRealProbability))}%` }}>
                <span>{analysis.label === 'Inconclusive' || analysis.modelDisagreement ? 'Estimated real' : 'Likely real'} {formatPercent(analysis.likelyRealProbability)}%</span>
              </div>
              <div style={{ width: `${Math.max(0, Math.min(100, analysis.aiGeneratedProbability))}%` }}>
                <span>{analysis.label === 'Inconclusive' || analysis.modelDisagreement ? 'Estimated AI/manipulated' : 'AI/manipulated'} {formatPercent(analysis.aiGeneratedProbability)}%</span>
              </div>
            </div>
          </AppCard>

          <section className="content-grid">
            <AppCard className="analysis-section span-8">
              <div className="card-header compact">
                <div>
                  <h2>Score Breakdown</h2>
                  <p>Weighted signals used to calculate the final authenticity score.</p>
                </div>
              </div>
              <ScoreBar label="Visual model score" value={analysis.visualScore} />
              <ScoreBar label="Metadata score" value={analysis.metadataScore} />
              <ScoreBar label="Temporal score" value={analysis.temporalScore} emptyLabel="Not available" />
              <ScoreBar label="Final weighted score" value={analysis.finalScore} />
            </AppCard>

            <AppCard className="analysis-section span-4">
              <div className="card-header compact">
                <div>
                  <h2>Metadata Summary</h2>
                  <p>Media properties extracted during FFmpeg processing.</p>
                </div>
              </div>
              <MetadataSummary metadata={metadataQuery.data} />
            </AppCard>
          </section>

          <AppCard className="analysis-section">
            <div className="card-header compact">
              <div>
                <h2>Evidence</h2>
                <p>Signals that influenced the probability-based result.</p>
              </div>
            </div>
            <EvidenceGroups evidence={analysis.evidenceItems} warnings={analysis.warnings} isMock={analysis.isMock} />
          </AppCard>

          <AppCard className="analysis-section">
            <div className="card-header compact">
              <div>
                <h2>Internal Origin Intelligence</h2>
                <p>Internal matching compares only against videos previously analyzed inside this system. It does not prove the original upload source.</p>
              </div>
            </div>
            <OriginMatches matches={matchesQuery.data ?? []} loading={matchesQuery.isLoading} />
          </AppCard>
        </>
      )}
    </main>
  )
}

function MetricCard({ label, value, icon, isMock = false }: { label: string; value: string; icon: ReactNode; isMock?: boolean }) {
  return (
    <AppCard className={`result-metric ${isMock ? 'result-metric-mock' : ''}`}>
      <span>{icon}</span>
      {isMock && <em>Mock</em>}
      <small>{label}</small>
      <strong>{value}</strong>
    </AppCard>
  )
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
  if (!component) {
    return (
      <div className="detector-card">
        <span>{title}</span>
        <strong>Unavailable</strong>
      </div>
    )
  }

  return (
    <div className="detector-card">
      <span>{title}</span>
      <strong>{formatPercent(component.ai_score * 100)}% AI</strong>
      {component.raw_frame_ai_score !== undefined && (
        <small>Raw frame score {formatPercent(component.raw_frame_ai_score * 100)}% - calibrated {formatPercent((component.calibrated_frame_ai_score ?? component.ai_score) * 100)}%</small>
      )}
      <small>{component.model_id}</small>
      <small>{formatWords(component.model_capability)} - confidence {formatPercent(component.confidence * 100)}%</small>
      {component.reliability?.accuracy !== undefined && (
        <small>Reliability {formatPercent(component.reliability.accuracy * 100)}% from {component.reliability.sample_count ?? 0} samples</small>
      )}
    </div>
  )
}

function ScoreBar({ label, value, emptyLabel = 'No signal' }: { label: string; value?: number; emptyLabel?: string }) {
  const percent = typeof value === 'number' ? Math.max(0, Math.min(100, value * 100)) : undefined
  return (
    <div className="score-row">
      <div>
        <span>{label}</span>
        <strong>{percent === undefined ? emptyLabel : `${formatPercent(percent)}%`}</strong>
      </div>
      <div className="score-track">
        <span style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  )
}

function EvidenceGroups({ evidence, warnings, isMock }: { evidence: EvidenceItem[]; warnings: string[]; isMock: boolean }) {
  const groups = [
    [isMock ? 'Mock frame indicators - development only' : 'AI frame indicators', evidence.filter((item) => item.type === 'AiFrameScore')],
    ['Metadata warnings', evidence.filter((item) => item.type === 'MetadataWarning')],
    ['Confidence and system notes', evidence.filter((item) => item.type !== 'AiFrameScore' && item.type !== 'MetadataWarning')],
  ] as const

  return (
    <div className="evidence-groups">
      {warnings.length > 0 && <WarningPanel message={warnings.join(' ')} subtle />}
      {isMock && (
        <p className="mock-helper-copy">
          These scores were generated by the development mock model and should not be used to judge whether the video is real or AI-generated.
        </p>
      )}
      {groups.map(([title, items]) => (
        <div className="evidence-group" key={title}>
          <h3>{title}</h3>
          {items.length === 0 ? (
            <p className="muted-copy">No items in this category.</p>
          ) : (
            <div className="evidence-list">
              {items.map((item) => (
                <div className="evidence-card" key={item.id}>
                  <div>
                    <StatusBadge status={item.severity} />
                    <strong>{formatEvidenceTitle(item.title, isMock)}</strong>
                    <p>{item.description}</p>
                  </div>
                  <small>
                    {isFiniteNumber(item.timestampSeconds) ? `${item.timestampSeconds.toFixed(2)}s` : 'No timestamp'}
                    {isFiniteNumber(item.scoreImpact) ? ` - impact ${item.scoreImpact.toFixed(2)}` : ''}
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

function formatEvidenceTitle(title: string, isMock: boolean) {
  if (!isMock) return title

  return title
    .replace(/^High AI indicator frame$/i, 'Mock high-score frame')
    .replace(/^Moderate AI indicator frame$/i, 'Mock moderate-score frame')
    .replace(/^AI frame indicator$/i, 'Mock frame score')
}

function MetadataSummary({ metadata }: { metadata?: MetadataResult }) {
  if (!metadata) {
    return <p className="muted-copy">Metadata summary unavailable.</p>
  }

  const rows = [
    ['Duration', metadata.durationSeconds ? `${metadata.durationSeconds.toFixed(2)}s` : undefined],
    ['Resolution', metadata.resolution],
    ['FPS', metadata.fps?.toString()],
    ['Codec', metadata.codec],
    ['Audio', metadata.audioCodec],
    ['Bitrate', metadata.bitrate?.toLocaleString()],
  ]

  return (
    <div className="metadata-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value ?? 'Unknown'}</strong>
        </div>
      ))}
    </div>
  )
}

function OriginMatches({ matches, loading }: { matches: SourceMatch[]; loading: boolean }) {
  if (loading) {
    return <LoadingState text="Checking internal matches..." />
  }

  if (matches.length === 0) {
    return <EmptyState icon={<FileVideoIcon />} title="No internal matches found" description="This video did not match previously analyzed internal videos above the configured threshold." />
  }

  return (
    <div className="match-list">
      {matches.map((match) => (
        <div className="match-card" key={match.id}>
          <div>
            <strong>#{match.rank} {match.title ?? 'Internal match'}</strong>
            <span>{match.platform} - {match.confidence} confidence</span>
          </div>
          <div>
            <strong>{formatPercent(match.similarityScore * 100)}%</strong>
            <span>{match.uploadDatetime ? dayjs(match.uploadDatetime).format('MMM D, YYYY') : 'Date unavailable'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function getModelMode(analysis?: AnalysisResult) {
  if (!analysis) return 'Unknown model'
  if (analysis.isMock) return 'Mock Model'
  if (analysis.modelCapability === 'ensemble_video_frame') return 'Ensemble: Video + Frame Detector'
  if (analysis.modelCapability === 'frame_image') return 'Frame-Level Model'
  if (analysis.modelCapability === 'video_temporal') return 'Real Video Model'
  return 'AI Model'
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
    summary: analysis.summary ?? 'This result is probability-based and generated from available analysis signals.',
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
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

function formatPercent(value: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(100, numeric)).toFixed(1)
}

function formatWords(value?: string) {
  return (value || 'Unknown').replace(/_/g, ' ')
}
