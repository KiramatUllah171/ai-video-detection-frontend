import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import { ShieldIcon } from './icons'

type AppLogoProps = {
  compact?: boolean
  to?: string
}

export function AppLogo({ compact = false, to = '/dashboard' }: AppLogoProps) {
  const { t } = useLanguage()
  const content = (
    <>
      <span className="app-logo-mark">
        <ShieldIcon />
      </span>
      <span className="app-logo-text">
        <strong>{t('app.name')}</strong>
        {!compact && <small>{t('app.tagline')}</small>}
      </span>
    </>
  )

  return (
    <Link className="app-logo" to={to} aria-label={t('app.homeLabel')}>
      {content}
    </Link>
  )
}
