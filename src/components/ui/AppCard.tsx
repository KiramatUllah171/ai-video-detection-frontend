import type { HTMLAttributes, ReactNode } from 'react'

type AppCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  hover?: boolean
}

export function AppCard({ children, hover = false, className = '', ...props }: AppCardProps) {
  return (
    <section className={`app-card ${hover ? 'app-card-hover' : ''} ${className}`} {...props}>
      {children}
    </section>
  )
}
