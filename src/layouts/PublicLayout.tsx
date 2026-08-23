import { Link, NavLink, Outlet } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'
import { buttonClassName } from '../components/ui/buttonStyles'

const publicLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-and-conditions', label: 'Terms & Conditions' },
]

export function PublicLayout() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="public-layout">
      <header className="public-topbar">
        <AppLogo to="/" />
        <nav className="public-nav" aria-label="Public navigation">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `public-nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="public-actions">
          <Link className={buttonClassName('outline')} to="/login">Sign in</Link>
          <Link className={buttonClassName('primary')} to="/signup">Create account</Link>
        </div>
      </header>

      <Outlet />

      <footer className="public-footer">
        <div>
          <AppLogo to="/" compact />
          <p>Probability-based AI video authenticity, metadata, and origin review for accountable media workflows.</p>
        </div>
        <nav aria-label="Footer navigation">
          {publicLinks.map((link) => (
            <Link key={link.to} to={link.to}>{link.label}</Link>
          ))}
        </nav>
        <div className="public-footer-bottom">
          <span>&copy; {currentYear} sachvideoai. All rights reserved.</span>
          <span>Secure video authenticity reports for registered users.</span>
        </div>
      </footer>
    </div>
  )
}
