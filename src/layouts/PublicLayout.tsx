import { Link, NavLink, Outlet } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'
import { ResponsiveNavigation } from '../components/ui/ResponsiveNavigation'
import { buttonClassName } from '../components/ui/buttonStyles'
import { GlobeIcon } from '../components/ui/icons'
import { useLanguage, type LanguageCode } from '../i18n/LanguageContext'

const publicLinks = [
  { to: '/', labelKey: 'public.nav.home', end: true },
  { to: '/about', labelKey: 'public.nav.about' },
  { to: '/contact', labelKey: 'public.nav.contact' },
  { to: '/privacy-policy', labelKey: 'public.nav.privacy' },
  { to: '/terms-and-conditions', labelKey: 'public.nav.terms' },
]

export function PublicLayout() {
  const { language, languages, setLanguage, t } = useLanguage()
  const currentYear = new Date().getFullYear()

  return (
    <div className="public-layout">
      <header className="public-topbar">
        <AppLogo to="/" />
        <ResponsiveNavigation className="public-nav" label={t('public.nav.label')}>
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`}
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </ResponsiveNavigation>
        <div className="public-actions">
          <label className="language-control public-language-control">
            <GlobeIcon />
            <span className="sr-only">{t('language.label')}</span>
            <select
              aria-label={t('language.label')}
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            >
              {languages.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Link className={buttonClassName('outline')} to="/login">{t('public.action.signIn')}</Link>
          <Link className={buttonClassName('primary')} to="/upload">{t('nav.uploadVideo')}</Link>
        </div>
      </header>

      <Outlet />

      <footer className="public-footer">
        <div>
          <AppLogo to="/" compact />
          <p>{t('public.footer.description')}</p>
        </div>
        <nav aria-label={t('public.nav.footer')}>
          {publicLinks.map((link) => (
            <Link key={link.to} to={link.to}>{t(link.labelKey)}</Link>
          ))}
        </nav>
        <div className="public-footer-bottom">
          <span>{t('public.footer.copyright', { year: currentYear })}</span>
          <span>{t('public.footer.secureReports')}</span>
        </div>
      </footer>
    </div>
  )
}
