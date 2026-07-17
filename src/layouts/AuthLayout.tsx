import type { ReactNode } from 'react'
import { AppLogo } from '../components/ui/AppLogo'
import { ActivityIcon, CheckCircleIcon, ShieldIcon, UploadIcon } from '../components/ui/icons'
import { useLanguage } from '../i18n/LanguageContext'

type AuthLayoutProps = {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useLanguage()
  const benefits = [
    t('auth.benefitUpload'),
    t('auth.benefitScoring'),
    t('auth.benefitProgress'),
    t('auth.benefitReport'),
  ]

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label={t('auth.productOverview')}>
        <div className="auth-hero-inner">
          <AppLogo to="/login" />
          <div className="auth-hero-copy">
            <span className="hero-pill">
              <ShieldIcon />
              {t('auth.secureWorkflow')}
            </span>
            <h1>{t('auth.heroTitle')}</h1>
            <p>{t('auth.heroText')}</p>
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
              <strong>{t('auth.privateUpload')}</strong>
              <span>{t('auth.storagePipeline')}</span>
            </div>
            <div>
              <ActivityIcon />
              <strong>{t('auth.traceableStatus')}</strong>
              <span>{t('auth.queuedVisibility')}</span>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  )
}
