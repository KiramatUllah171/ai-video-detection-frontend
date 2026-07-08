import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AppButton } from '../components/ui/AppButton'
import { AppLogo } from '../components/ui/AppLogo'
import { BarChartIcon, LogOutIcon, UploadIcon, UserIcon } from '../components/ui/icons'

export function AppLayout() {
  const auth = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await auth.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <AppLogo />
        <nav className="topbar-nav" aria-label="Primary navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BarChartIcon />
            Dashboard
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadIcon />
            Upload Video
          </NavLink>
        </nav>
        <div className="user-menu">
          <div className="user-chip">
            <UserIcon />
            <span>{auth.user?.name ?? auth.user?.email}</span>
          </div>
          <AppButton variant="ghost" onClick={handleLogout} icon={<LogOutIcon />}>
            Logout
          </AppButton>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
