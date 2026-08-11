'use client'

import { type InputHTMLAttributes, type ReactNode, useEffect, useId, useRef } from 'react'
import { FiCheck, FiMinus } from 'react-icons/fi'

import { CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_MARK_RADIUS } from './controlStyles'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  helperText?: string
  /** Partial selection (e.g. Select all footer). */
  indeterminate?: boolean
  /** Dense row layout (menus / lists). */
  compact?: boolean
}

export function Checkbox(props: CheckboxProps) {
  const { label, helperText, className = '', id, indeterminate = false, compact = false, disabled, ...rest } = props
  const generatedId = useId()
  const checkId = id || generatedId
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const control = (
    <span className={`relative inline-flex h-4 w-4 shrink-0 ${compact ? '' : 'mt-0.5'}`}>
      <input ref={inputRef} id={checkId} type="checkbox" className="peer sr-only" disabled={disabled} {...rest} />
      <span
        className={[
          'absolute inset-0 border border-app-border bg-app-surface transition peer-focus-visible:ring-2 peer-focus-visible:ring-app-accent/35',
          'peer-checked:border-app-accent peer-checked:bg-app-accent',
          'peer-indeterminate:border-app-accent peer-indeterminate:bg-app-accent',
          'peer-disabled:opacity-50',
          CONTROL_MARK_RADIUS,
        ].join(' ')}
      />
      <FiCheck
        className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-white opacity-0 transition peer-checked:opacity-100 peer-indeterminate:opacity-0"
        aria-hidden
      />
      <FiMinus className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-white opacity-0 transition peer-indeterminate:opacity-100" aria-hidden />
    </span>
  )

  if (label == null && !helperText) {
    return <span className={`inline-flex ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>{control}</span>
  }

  return (
    <div className={`${compact ? '' : 'grid gap-1'} ${className}`}>
      <label
        htmlFor={checkId}
        className={`flex text-sm text-app-muted ${compact ? 'items-center gap-3' : 'items-start gap-2.5'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        {control}
        <span className="min-w-0 flex-1">
          <span className={compact ? 'block text-sm text-app-text' : `${CONTROL_LABEL_CLASS} normal-case tracking-normal text-app-text`}>{label}</span>
          {helperText ? <span className={`mt-0.5 block ${CONTROL_HELPER_CLASS}`}>{helperText}</span> : null}
        </span>
      </label>
    </div>
  )
}
