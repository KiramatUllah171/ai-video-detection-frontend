import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppCard } from '../components/ui/AppCard'
import { buttonClassName } from '../components/ui/buttonStyles'
import { ActivityIcon, BarChartIcon, FileVideoIcon, ShieldIcon, UploadIcon } from '../components/ui/icons'

const supportEmail = 'kiramatdev@gmail.com'
const supportPhone = '+923145156620'
const supportPhoneLabel = '+92 3145156620'

const capabilities = [
  {
    icon: <UploadIcon />,
    title: 'Secure video upload',
    text: 'Upload supported video files from your account and keep them inside a protected workspace.',
  },
  {
    icon: <ActivityIcon />,
    title: 'Authenticity analysis',
    text: 'Get a clear probability-based result using available video, metadata, and confidence signals.',
  },
  {
    icon: <BarChartIcon />,
    title: 'Easy report view',
    text: 'See the main result first, then open technical details only when you need more context.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Private workspace',
    text: 'Your uploaded videos are not public, and other users cannot view or review your files.',
  },
]

const reportDetails = [
  'Final verdict and result confidence',
  'AI/manipulated and likely-real probability balance',
  'Metadata summary including codec, resolution, FPS, bitrate, encoder, and creation time when available',
  'Evidence items such as missing metadata warnings or model confidence notes',
  'Matching information when the system finds a related previous upload',
  'Downloadable PDF authenticity report for your records',
]

export function HomePage() {
  return (
    <main className="public-page">
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="hero-pill light"><ShieldIcon />Video Authenticity Reports</span>
          <h1>AI video authenticity reports for safer review.</h1>
          <p>
            sachvideoai helps you upload videos, check authenticity signals, review clear results, and download
            a professional PDF report from a secure account workspace.
          </p>
          <div className="public-hero-actions">
            <Link className={buttonClassName('primary')} to="/signup">Create account</Link>
            <Link className={buttonClassName('outline')} to="/login">Sign in</Link>
          </div>
        </div>
        <AppCard className="public-hero-card">
          <div className="public-verdict-preview">
            <span>Report preview</span>
            <strong>Clear authenticity summary</strong>
            <p>View AI risk, likely-real probability, confidence, metadata, evidence, and matching details in one report.</p>
          </div>
          <div className="public-balance-bar" aria-hidden="true">
            <span className="real" style={{ width: '64%' }} />
            <span className="ai" style={{ width: '36%' }} />
          </div>
          <div className="public-mini-grid">
            <span><strong>Secure</strong>Uploads</span>
            <span><strong>Tracked</strong>Processing</span>
            <span><strong>Exportable</strong>PDF reports</span>
          </div>
        </AppCard>
      </section>

      <section className="public-section">
        <div className="public-section-heading">
          <span className="eyebrow">How it works</span>
          <h2>A simple workflow for video checking</h2>
          <p>Upload a video, wait for processing, then review the result and download your report.</p>
        </div>
        <div className="public-card-grid">
          {capabilities.map((item) => (
            <AppCard className="public-feature-card" key={item.title}>
              <span className="public-feature-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </AppCard>
          ))}
        </div>
      </section>

      <section className="public-section public-split">
        <AppCard className="public-info-card">
          <span className="eyebrow">Reports</span>
          <h2>Helpful results with the right level of caution.</h2>
          <p>
            Results are probability-based and should be used as guidance. They help you understand risk, but they should
            not be treated as absolute proof on their own.
          </p>
        </AppCard>
        <AppCard className="public-info-card">
          <span className="eyebrow">Account support</span>
          <h2>Support is available for access, billing, and report questions.</h2>
          <p>
            If you need help with your account, payment questions, or a report issue, contact support with your registered email address.
          </p>
        </AppCard>
      </section>

      <section className="public-section">
        <div className="public-section-heading">
          <span className="eyebrow">Report details</span>
          <h2>What a completed report can include</h2>
          <p>Each report is based on the video you upload and the analysis results available for that file.</p>
        </div>
        <AppCard className="public-report-list">
          {reportDetails.map((item) => (
            <span key={item}><CheckMark />{item}</span>
          ))}
        </AppCard>
      </section>
    </main>
  )
}

export function AboutPage() {
  return (
    <PublicDocumentPage
      eyebrow="About"
      title="A secure way to check video authenticity."
      subtitle="sachvideoai helps users understand whether a video shows signs of AI generation or manipulation."
    >
      <PublicDocumentSection title="What we provide">
        <p>
          The platform supports secure video upload, processing status tracking, authenticity scoring, metadata review,
          matching information when available, and downloadable PDF reports.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="How the review works">
        <ul>
          <li>You upload a video and confirm that you have the right to submit it.</li>
          <li>The system processes the file and prepares an authenticity result.</li>
          <li>The result shows AI/manipulated probability, likely-real probability, confidence, evidence, and metadata details when available.</li>
          <li>You can download a PDF report for your own records.</li>
        </ul>
      </PublicDocumentSection>
      <PublicDocumentSection title="Important limitation">
        <p>
          The service produces probability-based guidance. It does not guarantee authenticity, manipulation,
          authorship, or legal responsibility.
        </p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

export function ContactPage() {
  return (
    <PublicDocumentPage
      eyebrow="Contact"
      title="Contact sachvideoai"
      subtitle="For account, payment, report, or general support questions, contact us directly."
    >
      <div className="public-contact-grid">
        <AppCard className="public-contact-card">
          <span className="public-feature-icon"><ShieldIcon /></span>
          <h2>Email support</h2>
          <p>Send your account, billing, or report question with your registered email address so we can identify your request.</p>
          <a className={buttonClassName('outline')} href={`mailto:${supportEmail}?subject=AI%20Video%20Detection%20support`}>{supportEmail}</a>
        </AppCard>
        <AppCard className="public-contact-card">
          <span className="public-feature-icon"><FileVideoIcon /></span>
          <h2>Phone support</h2>
          <p>For urgent account or payment questions, you can contact us by phone during normal support hours.</p>
          <a className={buttonClassName('outline')} href={`tel:${supportPhone}`}>{supportPhoneLabel}</a>
        </AppCard>
      </div>
      <PublicDocumentSection title="Before sending video-related requests">
        <p>
          Please do not send sensitive video files through email or chat. Use the secure upload page inside your account
          and share only the relevant report reference when asking for help.
        </p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

export function PrivacyPolicyPage() {
  return (
    <PublicDocumentPage
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      subtitle="This policy explains what information is used to provide your account, video analysis, and report features."
    >
      <PublicDocumentSection title="Information we process">
        <ul>
          <li>Account information such as name, email address, secure login details, email confirmation state, and account status.</li>
          <li>Uploaded video files and related file properties such as name, content type, size, format, duration, resolution, FPS, codec, bitrate, encoder, and creation time when available.</li>
          <li>Analysis data such as AI/manipulated probability, likely-real probability, confidence, verdict, metadata warnings, evidence, matching details, processing status, and report data.</li>
          <li>Security and account records such as login/session state, password reset requests, email confirmation requests, upload timestamps, and processing status.</li>
        </ul>
      </PublicDocumentSection>
      <PublicDocumentSection title="How information is used">
        <p>
          Information is used to create and secure accounts, process uploaded videos, produce authenticity reports,
          prevent misuse, improve reliability, and provide customer support.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="Automated analysis services">
        <p>
          The service may use automated analysis tools to help check authenticity signals. These results are used to prepare
          the report shown inside your account.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="Data protection">
        <p>
          Uploaded videos are kept inside protected application storage and are not publicly visible. Other users cannot
          view, download, or review your uploaded videos.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="Your choices">
        <p>
          You can contact support for account, billing, or privacy questions. Account access may be restricted when required
          for security, misuse prevention, or policy reasons.
        </p>
      </PublicDocumentSection>
    </PublicDocumentPage>
  )
}

export function TermsAndConditionsPage() {
  return (
    <PublicDocumentPage
      eyebrow="Terms & Conditions"
      title="Terms & Conditions"
      subtitle="These terms describe the expected use of sachvideoai and the limits of the authenticity reports."
    >
      <PublicDocumentSection title="Use of the service">
        <ul>
          <li>You must only upload videos that you have the right to submit for analysis.</li>
          <li>You are responsible for using reports with proper context before relying on them.</li>
          <li>You must not use the service to upload unlawful, infringing, abusive, or unauthorized content.</li>
        </ul>
      </PublicDocumentSection>
      <PublicDocumentSection title="Reports and analysis">
        <p>
          Authenticity results are probability-based guidance. They are not absolute proof that a video is real, AI-generated,
          manipulated, authored by a specific person, or legally attributable to any party.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="Accounts and access">
        <p>
          Users must maintain accurate account information and protect their login credentials. The platform may require email confirmation,
          strong passwords, session expiration, and access restrictions for security.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="Payments and subscriptions">
        <p>
          Paid access, subscription limits, credits, invoices, refunds, and billing support will be handled according to the
          plan and checkout terms shown when paid plans are available.
        </p>
      </PublicDocumentSection>
      <PublicDocumentSection title="Service availability">
        <p>
          Processing time and result availability can vary based on video size, queue state, analysis workload, and system health.
        </p>
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
