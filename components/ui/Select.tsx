'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { CONTROL_CLASS, CONTROL_HELPER_CLASS, CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface SelectProps {
  label?: string
  helperText?: string
  options: SelectOption[]
  value: string
  onChange?(value: string): void
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
}

export function Select(props: SelectProps) {
  const { label, helperText, options, value, onChange, placeholder = 'Select', disabled, className = '', name } = props
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value])

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className={`grid gap-1.5 text-left ${className}`}>
      {label ? <span className={CONTROL_LABEL_CLASS}>{label}</span> : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className={`flex ${CONTROL_CLASS} ${CONTROL_RADIUS} items-center justify-between gap-3 pr-10 text-left ${disabled ? 'opacity-60' : 'hover:border-app-ink'}`}
          onClick={() => !disabled && setOpen((v) => !v)}
        >
          <span className={`truncate ${selected ? 'text-app-text' : 'text-app-muted'}`}>{selected?.label ?? placeholder}</span>
          <svg
            className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted transition ${open ? 'rotate-180 text-app-ink' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>

        {open && !disabled ? (
          <ul id={listId} role="listbox" className={`absolute z-30 mt-1 max-h-60 w-full overflow-auto border border-app-border bg-app-surface py-1 shadow-sm ${CONTROL_RADIUS}`}>
            {options.map((option) => {
              const active = option.value === value
              return (
                <li key={option.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                      option.disabled ? 'cursor-not-allowed opacity-40' : active ? 'bg-app-accentSoft text-app-ink' : 'hover:bg-app-subtle'
                    }`}
                    onClick={() => {
                      if (option.disabled) return
                      onChange?.(option.value)
                      setOpen(false)
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {active ? (
                      <svg className="h-3.5 w-3.5 text-app-accent" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M3 8.5 6.5 12 13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                      </svg>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
      {helperText ? <span className={CONTROL_HELPER_CLASS}>{helperText}</span> : null}
    </div>
  )
}
