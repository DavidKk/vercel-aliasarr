import type { ReactNode, TextareaHTMLAttributes } from 'react'

import { CONTROL_CLASS, CONTROL_ERROR_CLASS, CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  helperText?: string
  error?: boolean
  errorMessage?: string
}

export function Textarea(props: TextareaProps) {
  const { label, helperText, error, errorMessage, className = '', id, ...rest } = props
  const areaId = id || (typeof label === 'string' ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const areaClass = [
    CONTROL_CLASS,
    CONTROL_RADIUS,
    'min-h-[8rem] resize-y font-mono text-xs leading-relaxed',
    error ? 'border-app-danger focus:border-app-danger focus:ring-app-danger/20' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (!label) {
    return <textarea id={areaId} className={areaClass} {...rest} />
  }

  return (
    <label className="grid gap-1.5 text-left" htmlFor={areaId}>
      <span className={CONTROL_LABEL_CLASS}>{label}</span>
      <textarea id={areaId} className={areaClass} {...rest} />
      {helperText ? <span className={CONTROL_HELPER_CLASS}>{helperText}</span> : null}
      {error && errorMessage ? <span className={CONTROL_ERROR_CLASS}>{errorMessage}</span> : null}
    </label>
  )
}
