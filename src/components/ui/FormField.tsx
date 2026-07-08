import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type FormFieldProps = {
  label: string
  error?: string
  helper?: string
  children: ReactNode
}

export function FormField({ label, error, helper, children }: FormFieldProps) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {children}
      {helper && !error && <span className="form-helper">{helper}</span>}
      {error && <span className="form-error">{error}</span>}
    </label>
  )
}

export function AppInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="app-input" {...props} />
}

export function AppTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="app-input app-textarea" {...props} />
}
