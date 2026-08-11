import type { InputHTMLAttributes, ReactNode } from 'react'

import { CONTROL_CLASS, CONTROL_ERROR_CLASS, CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  helperText?: string
  error?: boolean
  errorMessage?: string
}

export function Input(props: InputProps) {
  const { label, helperText, error, errorMessage, className = '', id, ...rest } = props
  const inputId = id || (typeof label === 'string' ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const inputClass = [CONTROL_CLASS, CONTROL_RADIUS, error ? 'border-app-danger focus:border-app-danger focus:ring-app-danger/20' : '', className].filter(Boolean).join(' ')

  if (!label) {
    return <input id={inputId} className={inputClass} {...rest} />
  }

  return (
    <label className="grid gap-1.5 text-left" htmlFor={inputId}>
      <span className={CONTROL_LABEL_CLASS}>{label}</span>
      <input id={inputId} className={inputClass} {...rest} />
      {helperText ? <span className={CONTROL_HELPER_CLASS}>{helperText}</span> : null}
      {error && errorMessage ? <span className={CONTROL_ERROR_CLASS}>{errorMessage}</span> : null}
    </label>
  )
}
