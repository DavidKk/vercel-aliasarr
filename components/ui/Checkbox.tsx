import type { InputHTMLAttributes, ReactNode } from 'react'

import { CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  helperText?: string
}

export function Checkbox(props: CheckboxProps) {
  const { label, helperText, className = '', id, ...rest } = props
  const checkId = id || (typeof label === 'string' ? `check-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  return (
    <div className={`grid gap-1 ${className}`}>
      <label htmlFor={checkId} className="flex cursor-pointer items-start gap-2.5 text-sm text-app-muted">
        <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0">
          <input id={checkId} type="checkbox" className="peer sr-only" {...rest} />
          <span
            className={[
              'absolute inset-0 border border-app-border bg-app-surface transition peer-focus-visible:ring-2 peer-focus-visible:ring-app-accent/35',
              'peer-checked:border-app-accent peer-checked:bg-app-accent',
              'peer-disabled:opacity-50',
              CONTROL_RADIUS,
            ].join(' ')}
          />
          <svg
            className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-white opacity-0 transition peer-checked:opacity-100"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path d="M3 8.5 6.5 12 13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
        </span>
        <span>
          <span className={`${CONTROL_LABEL_CLASS} normal-case tracking-normal text-app-text`}>{label}</span>
          {helperText ? <span className={`mt-0.5 block ${CONTROL_HELPER_CLASS}`}>{helperText}</span> : null}
        </span>
      </label>
    </div>
  )
}
