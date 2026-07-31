import type { ReactNode } from 'react'
import { AppLogo } from '../components/ui/AppLogo'
import { AppCard } from '../components/ui/AppCard'
import { ActivityIcon, FileVideoIcon, UploadIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'

type AuthLayoutProps = {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useLanguage()
  const features = [
    { icon: <UploadIcon />, label: t('auth.featureSecureUpload') },
    { icon: <ActivityIcon />, label: t('auth.featureAiAnalysis') },
    { icon: <FileVideoIcon />, label: t('auth.featureTrustedReports') },
  ]

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label={t('auth.productOverview')}>
        <div className="auth-hero-inner">
          <AppLogo to="/login" />
          <div className="auth-hero-copy">
            <h1>
              <span>{t('auth.heroLineOne')}</span>
              <span>{t('auth.heroLineTwo')}</span>
            </h1>
            <p>{t('auth.heroText')}</p>
          </div>
          <div className="auth-reference-features">
            {features.map((feature) => (
              <div className="auth-reference-feature" key={feature.label}>
                <span aria-hidden="true">{feature.icon}</span>
                <strong>{feature.label}</strong>
              </div>
            ))}
          </div>
          <p className="auth-security-note">{t('auth.copyright')}</p>
        </div>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  )
}

type AuthCardProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export function AuthCard({ eyebrow, title, description, children }: AuthCardProps) {
  return (
    <AppCard className="auth-card">
      <div className="auth-card-header">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{description}</p>
      </div>
      {children}
    </AppCard>
  )
}
