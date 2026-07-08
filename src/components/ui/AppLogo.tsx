import { Link } from 'react-router-dom'
import { ShieldIcon } from './icons'

type AppLogoProps = {
  compact?: boolean
  to?: string
}

export function AppLogo({ compact = false, to = '/dashboard' }: AppLogoProps) {
  const content = (
    <>
      <span className="app-logo-mark">
        <ShieldIcon />
      </span>
      <span className="app-logo-text">
        <strong>AI Video Detection</strong>
        {!compact && <small>Authenticity Intelligence</small>}
      </span>
    </>
  )

  return (
    <Link className="app-logo" to={to} aria-label="AI Video Detection home">
      {content}
    </Link>
  )
}
