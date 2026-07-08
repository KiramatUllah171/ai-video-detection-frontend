import type { ReactNode } from 'react'
import { AppLogo } from '../components/ui/AppLogo'
import { ActivityIcon, CheckCircleIcon, ShieldIcon, UploadIcon } from '../components/ui/icons'

type AuthLayoutProps = {
  children: ReactNode
}

const benefits = [
  'Secure video upload workflow',
  'AI-assisted authenticity scoring',
  'Track analysis progress',
  'Professional report pipeline',
]

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label="Product overview">
        <div className="auth-hero-inner">
          <AppLogo to="/login" />
          <div className="auth-hero-copy">
            <span className="hero-pill">
              <ShieldIcon />
              Secure forensic workflow
            </span>
            <h1>AI-assisted video authenticity analysis</h1>
            <p>
              Upload, analyze, and track video integrity with a secure professional workflow built for
              modern teams.
            </p>
          </div>
          <div className="benefit-list">
            {benefits.map((benefit) => (
              <div className="benefit-item" key={benefit}>
                <CheckCircleIcon />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          <div className="trust-grid">
            <div>
              <UploadIcon />
              <strong>Private upload</strong>
              <span>Storage-first pipeline</span>
            </div>
            <div>
              <ActivityIcon />
              <strong>Traceable status</strong>
              <span>Queued job visibility</span>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  )
}
