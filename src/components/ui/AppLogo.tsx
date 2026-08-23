import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'

type AppLogoProps = {
  compact?: boolean
  to?: string
}

export function AppLogo({ compact = false, to = '/dashboard' }: AppLogoProps) {
  const { t } = useLanguage()

  return (
    <Link className={`app-logo app-logo-image-only ${compact ? 'app-logo-compact' : ''}`} to={to} aria-label={t('app.homeLabel')}>
      <span className="app-logo-mark">
        <img className="brand-logo-image" src="/sachvideoai-logo.png" alt="" aria-hidden="true" draggable={false} />
      </span>
    </Link>
  )
}
