import type { ReactNode } from 'react'

/** Keeps wide data local and allows keyboard users to pan it in either direction. */
export function ScrollRegion({ label, children, className = 'table-shell' }: {
  label: string
  children: ReactNode
  className?: string
}) {
  return <div className={className} role="region" aria-label={label} tabIndex={0}>{children}</div>
}
