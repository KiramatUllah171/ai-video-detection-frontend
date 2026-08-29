import { useLanguage } from '../../i18n/LanguageContext'

type LoadingStateProps = {
  text?: string
}

export function LoadingState({ text }: LoadingStateProps) {
  const { t } = useLanguage()

  return (
    <div className="loading-state" role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{text ?? t('common.loadingSecureWorkspace')}</span>
    </div>
  )
}
