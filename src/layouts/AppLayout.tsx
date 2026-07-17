import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AppLogo } from '../components/ui/AppLogo'
import { BarChartIcon, GlobeIcon, LogOutIcon, MoonIcon, SunIcon, UploadIcon } from '../components/ui/icons'
import { useLanguage, type LanguageCode } from '../i18n/LanguageContext'

const themeStorageKey = 'ai-video-detection-theme'

export function AppLayout() {
  const auth = useAuth()
  const { language, languages, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(themeStorageKey) === 'dark')
  const profileRef = useRef<HTMLDivElement | null>(null)
  const displayName = auth.user?.name || auth.user?.email || 'Account'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U'

  async function handleLogout() {
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
        <nav className="topbar-nav" aria-label="Primary navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BarChartIcon />
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadIcon />
            {t('nav.uploadVideo')}
          </NavLink>
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
            <div className="profile-dropdown" role="menu" aria-label="User profile">
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
                    <strong>{auth.user.role || t('profile.user')}</strong>
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
