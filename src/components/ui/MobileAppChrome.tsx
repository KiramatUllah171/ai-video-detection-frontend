import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLanguage, type LanguageCode } from '../../i18n/LanguageContext'
import { AppLogo } from './AppLogo'
import {
  ActivityIcon,
  ArrowLeftIcon,
  BarChartIcon,
  GlobeIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  UploadIcon,
  UserIcon,
  VideoIcon,
  XIcon,
} from './icons'

type MobileAppChromeProps = {
  darkMode: boolean
  displayName: string
  email?: string
  initial: string
  isAdmin: boolean
  isAuthenticated: boolean
  isLoadingProfile: boolean
  roleName?: string
  onLogout: () => void | Promise<void>
  onToggleTheme: () => void
}

export function MobileAppChrome({
  darkMode,
  displayName,
  email,
  initial,
  isAdmin,
  isAuthenticated,
  isLoadingProfile,
  roleName,
  onLogout,
  onToggleTheme,
}: MobileAppChromeProps) {
  const { language, languages, setLanguage, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpenAtLocation, setProfileOpenAtLocation] = useState<string | null>(null)
  const [adminOpenAtLocation, setAdminOpenAtLocation] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const title = getMobileTitle(location.pathname, isAdmin, t)
  const isSecondary = /^\/(analysis|processing|admin\/videos\/[^/]+)/.test(location.pathname)
  const profileOpen = profileOpenAtLocation === location.key
  const adminOpen = adminOpenAtLocation === location.key

  useEffect(() => {
    if (!profileOpen && !adminOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpenAtLocation(null)
        setAdminOpenAtLocation(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [adminOpen, profileOpen])

  function closeSheets() {
    setProfileOpenAtLocation(null)
    setAdminOpenAtLocation(null)
  }

  return (
    <>
      <header className="mobile-appbar">
        <div className="mobile-appbar-main">
          {isSecondary ? (
            <button type="button" className="mobile-icon-button" aria-label={t('common.previous')} onClick={() => navigate(-1)}>
              <DirectionalBackIcon />
            </button>
          ) : (
            <AppLogo compact />
          )}
          <div className="mobile-appbar-title">
            <span>{isAdmin && location.pathname.startsWith('/admin') ? t('admin.console') : t('app.name')}</span>
            <strong>{title}</strong>
          </div>
        </div>
        <div className="mobile-appbar-actions">
          <button
            type="button"
            className="mobile-icon-button"
            aria-label={darkMode ? t('theme.switchLight') : t('theme.switchDark')}
            aria-pressed={darkMode}
            onClick={onToggleTheme}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          {isAdmin && (
            <button
              type="button"
              className="mobile-icon-button"
              aria-label={t('nav.admin')}
              aria-expanded={adminOpen}
              onClick={() => {
                setProfileOpenAtLocation(null)
                setAdminOpenAtLocation(location.key)
              }}
            >
              <MenuIcon />
            </button>
          )}
          <button
            type="button"
            className="mobile-avatar-button"
            aria-label={t('profile.menu')}
            aria-expanded={profileOpen}
            onClick={() => {
              setAdminOpenAtLocation(null)
              setProfileOpenAtLocation(location.key)
            }}
          >
            {initial}
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label={t('nav.primary')}>
        <MobileNavLink to="/dashboard" icon={<BarChartIcon />} label={t('nav.dashboard')} match={(path) => path === '/dashboard' || path.startsWith('/analysis')} />
        <MobileNavLink to="/upload" icon={<UploadIcon />} label={t('nav.uploadVideo')} match={(path) => path === '/upload' || path.startsWith('/processing')} />
        {isAdmin && <MobileNavLink to="/admin/dashboard" icon={<ShieldIcon />} label={t('nav.admin')} match={(path) => path.startsWith('/admin')} />}
        <button
          type="button"
          className={`mobile-bottom-link ${profileOpen ? 'active' : ''}`}
          aria-label={t('profile.account')}
          aria-expanded={profileOpen}
          onClick={() => {
            setAdminOpenAtLocation(null)
            setProfileOpenAtLocation(location.key)
          }}
        >
          <UserIcon />
          <span>{t('profile.account')}</span>
        </button>
      </nav>

      {adminOpen && (
        <MobileSheet title={t('nav.admin')} onClose={closeSheets} closeButtonRef={closeButtonRef}>
          <div className="mobile-sheet-nav">
            <MobileSheetLink to="/admin/dashboard" icon={<ShieldIcon />} label={t('nav.admin')} onClick={closeSheets} />
            <MobileSheetLink to="/admin/users" icon={<UserIcon />} label={t('nav.users')} onClick={closeSheets} />
            <MobileSheetLink to="/admin/manual-requests" icon={<ActivityIcon />} label={t('nav.manualRequests')} onClick={closeSheets} />
            <MobileSheetLink to="/admin/videos" icon={<VideoIcon />} label={t('nav.videos')} onClick={closeSheets} />
            <MobileSheetLink to="/admin/requests" icon={<ActivityIcon />} label={t('nav.requests')} onClick={closeSheets} />
            <MobileSheetLink to="/admin/logs" icon={<ActivityIcon />} label={t('nav.logs')} onClick={closeSheets} />
          </div>
        </MobileSheet>
      )}

      {profileOpen && (
        <MobileSheet title={t('profile.account')} onClose={closeSheets} closeButtonRef={closeButtonRef}>
          <div className="mobile-profile-card">
            <span className="avatar-initial large" aria-hidden="true">{initial}</span>
            <div>
              <strong>{isLoadingProfile ? t('profile.loading') : displayName}</strong>
              {email && <span>{email}</span>}
              <small>{isAuthenticated ? localizeRoleName(roleName, t) : t('profile.guest')}</small>
            </div>
          </div>
          <div className="mobile-settings-list">
            <label className="mobile-setting-row">
              <span><GlobeIcon />{t('language.label')}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>
                {languages.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="mobile-setting-row" onClick={onToggleTheme}>
              <span>{darkMode ? <SunIcon /> : <MoonIcon />}{darkMode ? t('theme.lightMode') : t('theme.darkMode')}</span>
            </button>
            {isAuthenticated && (
              <button type="button" className="mobile-setting-row mobile-setting-danger" onClick={onLogout}>
                <span><LogOutIcon />{t('profile.logout')}</span>
              </button>
            )}
          </div>
        </MobileSheet>
      )}
    </>
  )
}

function MobileNavLink({
  to,
  icon,
  label,
  match,
}: {
  to: string
  icon: ReactNode
  label: string
  match?: (pathname: string) => boolean
}) {
  const location = useLocation()
  const active = match?.(location.pathname)
  return (
    <NavLink to={to} className={({ isActive }) => `mobile-bottom-link ${active ?? isActive ? 'active' : ''}`}>
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

function MobileSheetLink({ to, icon, label, onClick }: { to: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <NavLink to={to} className={({ isActive }) => `mobile-sheet-link ${isActive ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

function MobileSheet({
  children,
  closeButtonRef,
  onClose,
  title,
}: {
  children: ReactNode
  closeButtonRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  title: string
}) {
  const { t } = useLanguage()

  return (
    <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    }}>
      <section className="mobile-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <div className="mobile-sheet-header">
          <strong>{title}</strong>
          <button ref={closeButtonRef} type="button" className="mobile-icon-button" aria-label={t('admin.requests.closeDetails')} onClick={onClose}>
            <XIcon />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function DirectionalBackIcon() {
  const { language } = useLanguage()
  return <ArrowLeftIcon style={{ transform: language === 'en' ? undefined : 'scaleX(-1)' }} />
}

function getMobileTitle(pathname: string, isAdmin: boolean, t: ReturnType<typeof useLanguage>['t']) {
  if (pathname === '/upload') return t('nav.uploadVideo')
  if (pathname.startsWith('/processing')) return t('processing.title')
  if (pathname.startsWith('/analysis')) return t('analysis.title')
  if (pathname === '/admin/users') return t('nav.users')
  if (pathname === '/admin/manual-requests') return t('nav.manualRequests')
  if (pathname === '/admin/videos') return t('nav.videos')
  if (pathname.startsWith('/admin/videos/')) return t('admin.videoDetail.preview')
  if (pathname === '/admin/requests') return t('nav.requests')
  if (pathname === '/admin/logs') return t('nav.logs')
  if (pathname === '/admin/dashboard') return t('nav.admin')
  return isAdmin ? t('nav.dashboard') : t('nav.dashboard')
}

function localizeRoleName(roleName: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (roleName || 'User').toLowerCase()
  if (normalized === 'admin') return t('role.admin')
  if (normalized === 'reviewer') return t('role.reviewer')
  if (normalized === 'enterpriseadmin') return t('role.enterpriseAdmin')
  return t('role.user')
}
