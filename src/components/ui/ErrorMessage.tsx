import { AlertCircleIcon } from './icons'

type ErrorMessageProps = {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <AlertCircleIcon />
      <span>{message}</span>
    </div>
  )
}
