import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getUserRoleName, isAdminRole } from '../auth/roleUtils'
import { AppLogo } from '../components/ui/AppLogo'
import { ActivityIcon, BarChartIcon, GlobeIcon, LogOutIcon, MoonIcon, ShieldIcon, SunIcon, UploadIcon, UserIcon, VideoIcon } from '../components/ui/icons'
import { useLanguage, type LanguageCode } from '../i18n/LanguageContext'

const themeStorageKey = 'ai-video-detection-theme'

export function AppLayout() {
  const auth = useAuth()
  const { language, languages, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(themeStorageKey) === 'dark')
  const profileRef = useRef<HTMLDivElement | null>(null)
  const displayName = auth.user?.name || auth.user?.email || t('profile.account')
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U'
  const isAdmin = isAdminRole(auth.user?.role)

  async function handleLogout() {
    setDarkMode(false)
    document.documentElement.classList.remove('theme-dark')
    localStorage.setItem(themeStorageKey, 'light')
    await auth.logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkMode)
    localStorage.setItem(themeStorageKey, darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    if (!profileOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileOpen])

  return (
    <div className="app-layout">
      <header className="topbar">
        <AppLogo />
        <nav className="topbar-nav" aria-label={t('nav.primary')}>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BarChartIcon />
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadIcon />
            {t('nav.uploadVideo')}
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ShieldIcon />
                {t('nav.admin')}
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <UserIcon />
                {t('nav.users')}
              </NavLink>
              <NavLink to="/admin/videos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <VideoIcon />
                {t('nav.videos')}
              </NavLink>
              <NavLink to="/admin/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ActivityIcon />
                {t('nav.requests')}
              </NavLink>
            </>
          )}
        </nav>
        <div className="user-menu" ref={profileRef}>
          <button
            type="button"
            className="theme-toggle"
            aria-label={darkMode ? t('theme.switchLight') : t('theme.switchDark')}
            aria-pressed={darkMode}
            title={darkMode ? t('theme.lightMode') : t('theme.darkMode')}
            onClick={() => setDarkMode((enabled) => !enabled)}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <label className="language-control">
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
          <button
            type="button"
            className="user-chip"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="avatar-initial" aria-hidden="true">{initial}</span>
            <span>{displayName}</span>
          </button>
          {profileOpen && (
            <div className="profile-dropdown" role="menu" aria-label={t('profile.menu')}>
              {auth.isLoading ? (
                <div className="profile-loading">{t('profile.loading')}</div>
              ) : auth.user ? (
                <>
                  <div className="profile-summary">
                    <span className="avatar-initial large" aria-hidden="true">{initial}</span>
                    <div>
                      <strong>{displayName}</strong>
                      <span>{auth.user.email}</span>
                    </div>
                  </div>
                  <div className="profile-meta">
                    <span>{t('profile.accountType')}</span>
                    <strong>{localizeRoleName(getUserRoleName(auth.user.role), t)}</strong>
                  </div>
                  <button type="button" className="profile-logout" role="menuitem" onClick={handleLogout}>
                    <LogOutIcon />
                    {t('profile.logout')}
                  </button>
                </>
              ) : (
                <div className="profile-loading">{t('profile.unavailable')}</div>
              )}
            </div>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  )
}

function localizeRoleName(roleName: string | undefined, t: ReturnType<typeof useLanguage>['t']) {
  const normalized = (roleName || 'User').toLowerCase()
  if (normalized === 'admin') {
    return t('role.admin')
  }
  if (normalized === 'reviewer') {
    return t('role.reviewer')
  }
  if (normalized === 'enterpriseadmin') {
    return t('role.enterpriseAdmin')
  }
  return t('role.user')
}
