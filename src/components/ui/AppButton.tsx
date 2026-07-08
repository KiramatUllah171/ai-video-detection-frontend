import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClassName } from './buttonStyles'
import type { AppButtonVariant } from './buttonStyles'

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function AppButton({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <button
      className={buttonClassName(variant, fullWidth, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="button-spinner" aria-hidden="true" />}
      {!loading && icon && <span className="button-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
