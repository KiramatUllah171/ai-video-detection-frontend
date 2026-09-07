import { useId, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'

/** An in-flow disclosure: opening the menu never obscures page content. */
export function ResponsiveNavigation({ children, className, label }: {
  children: ReactNode
  className: string
  label: string
}) {
  const { t } = useLanguage()
  const location = useLocation()
  const [openAtLocation, setOpenAtLocation] = useState<string | null>(null)
  const open = openAtLocation === location.key
  const id = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="responsive-navigation" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpenAtLocation(null)
        toggleRef.current?.focus()
      }
    }}>
      <button
        ref={toggleRef}
        type="button"
        className="navigation-toggle"
        aria-label={t('nav.menu')}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpenAtLocation(open ? null : location.key)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>
      <nav id={id} className={`${className} responsive-nav ${open ? 'is-open' : ''}`} aria-label={label}
        onClick={(event) => {
          if ((event.target as Element).closest('a')) setOpenAtLocation(null)
        }}>
        {children}
      </nav>
    </div>
  )
}
