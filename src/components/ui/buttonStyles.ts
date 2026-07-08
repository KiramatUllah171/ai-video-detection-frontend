export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'

export function buttonClassName(
  variant: AppButtonVariant = 'primary',
  fullWidth = false,
  className = '',
) {
  return ['app-button', `app-button-${variant}`, fullWidth ? 'app-button-full' : '', className]
    .filter(Boolean)
    .join(' ')
}
