import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ActivityIcon, BarChartIcon, ClockIcon, FileVideoIcon, ShieldIcon, UploadIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'

const supportEmail = 'kiramatdev@gmail.com'
const supportPhone = '+923145156620'
const supportPhoneLabel = '+92 3145156620'

const capabilities = [
  {
    icon: <UploadIcon />,
    titleKey: 'public.home.capabilityUploadTitle',
    textKey: 'public.home.capabilityUploadText',
  },
  {
    icon: <ActivityIcon />,
    titleKey: 'public.home.capabilityAnalysisTitle',
    textKey: 'public.home.capabilityAnalysisText',
  },
  {
    icon: <BarChartIcon />,
    titleKey: 'public.home.capabilityReportTitle',
    textKey: 'public.home.capabilityReportText',
  },
  {
    icon: <ShieldIcon />,
    titleKey: 'public.home.capabilityPrivateTitle',
    textKey: 'public.home.capabilityPrivateText',
  },
]

const reportDetails = [
  'public.home.detailVerdict',
  'public.home.detailBalance',
  'public.home.detailMetadata',
  'public.home.detailEvidence',
  'public.home.detailMatching',
  'public.home.detailPdf',
]

export function HomePage() {
  const { t } = useLanguage()

  return (
    <main className="public-page">
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="hero-pill light"><ShieldIcon />{t('public.home.pill')}</span>
          <h1>{t('public.home.title')}</h1>
          <p>{t('public.home.subtitle')}</p>
          <div className="public-hero-actions">
            <Link className={buttonClassName('primary')} to="/upload">{t('nav.uploadVideo')}</Link>
            <Link className={buttonClassName('outline')} to="/signup">{t('public.action.createAccount')}</Link>
          </div>
        </div>
        <AppCard className="public-hero-card">
          <div className="public-verdict-preview">
            <span>{t('public.home.previewLabel')}</span>
            <strong>{t('public.home.previewTitle')}</strong>
            <p>{t('public.home.previewText')}</p>
          </div>
          <div className="public-balance-bar" aria-hidden="true">
            <span className="real" style={{ width: '64%' }} />
            <span className="ai" style={{ width: '36%' }} />
          </div>
          <div className="public-mini-grid">
            <span><strong>{t('public.home.secure')}</strong>{t('public.home.uploads')}</span>
            <span><strong>{t('public.home.tracked')}</strong>{t('public.home.processing')}</span>
            <span><strong>{t('public.home.exportable')}</strong>{t('public.home.pdfReports')}</span>
          </div>
        </AppCard>
      </section>

      <section className="public-section">
        <div className="public-section-heading">
          <span className="eyebrow">{t('public.home.workflowEyebrow')}</span>
          <h2>{t('public.home.workflowTitle')}</h2>
          <p>{t('public.home.workflowText')}</p>
        </div>
        <div className="public-card-grid">
          {capabilities.map((item) => (
            <AppCard className="public-feature-card" key={item.titleKey}>
              <span className="public-feature-icon">{item.icon}</span>
              <h3>{t(item.titleKey)}</h3>
              <p>{t(item.textKey)}</p>
            </AppCard>
          ))}
        </div>
      </section>

      <section className="public-section public-split">
        <AppCard className="public-info-card">
          <span className="eyebrow">{t('public.home.reportsEyebrow')}</span>
          <h2>{t('public.home.reportsTitle')}</h2>
          <p>{t('public.home.reportsText')}</p>
        </AppCard>
        <AppCard className="public-info-card">
          <span className="eyebrow">{t('public.home.supportEyebrow')}</span>
          <h2>{t('public.home.supportTitle')}</h2>
          <p>{t('public.home.supportText')}</p>
        </AppCard>
      </section>

      <section className="public-section">
        <AppCard className="public-retention-card">
          <span className="public-feature-icon"><ClockIcon /></span>
          <div>
            <span className="eyebrow">{t('retention.publicEyebrow')}</span>
            <h2>{t('retention.publicTitle')}</h2>
            <p>{t('retention.publicBody')}</p>
          </div>
        </AppCard>
      </section>

      <section className="public-section">
        <div className="public-section-heading">
          <span className="eyebrow">{t('public.home.detailsEyebrow')}</span>
          <h2>{t('public.home.detailsTitle')}</h2>
          <p>{t('public.home.detailsText')}</p>
        </div>
        <AppCard className="public-report-list">
          {reportDetails.map((item) => (
            <span key={item}><CheckMark />{t(item)}</span>
          ))}
        </AppCard>
      </section>
    </main>
  )
}

export function AboutPage() {
  const { t } = useLanguage()

  return (
    <PublicDocumentPage
      eyebrow={t('public.about.eyebrow')}
      title={t('public.about.title')}
      subtitle={t('public.about.subtitle')}
    >
      <PublicDocumentSection title={t('public.about.provideTitle')}>
        <p>{t('public.about.provideText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.about.reviewTitle')}>
        <ul>
          <li>{t('public.about.stepUpload')}</li>
          <li>{t('public.about.stepProcess')}</li>
          <li>{t('public.about.stepResult')}</li>
          <li>{t('public.about.stepPdf')}</li>
        </ul>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.about.limitationTitle')}>
        <p>{t('public.about.limitationText')}</p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

export function ContactPage() {
  const { t } = useLanguage()

  return (
    <PublicDocumentPage
      eyebrow={t('public.contact.eyebrow')}
      title={t('public.contact.title')}
      subtitle={t('public.contact.subtitle')}
    >
      <div className="public-contact-grid">
        <AppCard className="public-contact-card">
          <span className="public-feature-icon"><ShieldIcon /></span>
          <h2>{t('public.contact.emailTitle')}</h2>
          <p>{t('public.contact.emailText')}</p>
          <a className={buttonClassName('outline')} href={`mailto:${supportEmail}?subject=AI%20Video%20Detection%20support`}>{supportEmail}</a>
        </AppCard>
        <AppCard className="public-contact-card">
          <span className="public-feature-icon"><FileVideoIcon /></span>
          <h2>{t('public.contact.phoneTitle')}</h2>
          <p>{t('public.contact.phoneText')}</p>
          <a className={buttonClassName('outline')} href={`tel:${supportPhone}`}>{supportPhoneLabel}</a>
        </AppCard>
      </div>
      <PublicDocumentSection title={t('public.contact.beforeTitle')}>
        <p>{t('public.contact.beforeText')}</p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

export function PrivacyPolicyPage() {
  const { t } = useLanguage()

  return (
    <PublicDocumentPage
      eyebrow={t('public.privacy.eyebrow')}
      title={t('public.privacy.title')}
      subtitle={t('public.privacy.subtitle')}
    >
      <PublicDocumentSection title={t('public.privacy.infoTitle')}>
        <ul>
          <li>{t('public.privacy.infoAccount')}</li>
          <li>{t('public.privacy.infoVideo')}</li>
          <li>{t('public.privacy.infoAnalysis')}</li>
          <li>{t('public.privacy.infoSecurity')}</li>
        </ul>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.privacy.useTitle')}>
        <p>{t('public.privacy.useText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.privacy.automatedTitle')}>
        <p>{t('public.privacy.automatedText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.privacy.protectionTitle')}>
        <p>{t('public.privacy.protectionText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('retention.privacyTitle')}>
        <p>{t('retention.privacyBody')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.privacy.choicesTitle')}>
        <p>{t('public.privacy.choicesText')}</p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

export function TermsAndConditionsPage() {
  const { t } = useLanguage()

  return (
    <PublicDocumentPage
      eyebrow={t('public.terms.eyebrow')}
      title={t('public.terms.title')}
      subtitle={t('public.terms.subtitle')}
    >
      <PublicDocumentSection title={t('public.terms.useTitle')}>
        <ul>
          <li>{t('public.terms.useUpload')}</li>
          <li>{t('public.terms.useContext')}</li>
          <li>{t('public.terms.useMisuse')}</li>
        </ul>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.terms.reportsTitle')}>
        <p>{t('public.terms.reportsText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.terms.accountsTitle')}>
        <p>{t('public.terms.accountsText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.terms.paymentsTitle')}>
        <p>{t('public.terms.paymentsText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('public.terms.availabilityTitle')}>
        <p>{t('public.terms.availabilityText')}</p>
      </PublicDocumentSection>
      <PublicDocumentSection title={t('retention.termsTitle')}>
        <p>{t('retention.termsBody')}</p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

function PublicDocumentPage({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="public-page public-document-page">
      <section className="public-document-hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>
      <AppCard className="public-document-card">
        {children}
      </AppCard>
    </main>
  )
}

function PublicDocumentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="public-document-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
