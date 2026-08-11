'use client'

import type { CSSProperties } from 'react'

import { CONTROL_LABEL_CLASS, CONTROL_RADIUS } from './controlStyles'

export interface SwitchOption {
  label: string
  value: string
  disabled?: boolean
}

export interface SwitchProps {
  label?: string
  options: SwitchOption[]
  value: string
  onChange?(value: string): void
  className?: string
  disabled?: boolean
}

export function Switch(props: SwitchProps) {
  const { label, options, value, onChange, className = '', disabled = false } = props
  if (!options.length) return null

  const activeIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0
  )
  const segmentWidth = 100 / options.length
  const segmentInset = 8 / options.length
  const indicatorStyle: CSSProperties = {
    width: `calc(${segmentWidth}% - ${segmentInset}px)`,
    left: `calc(${segmentWidth * activeIndex}% + ${4 - segmentInset * activeIndex}px)`,
  }
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
  }

  return (
    <div className={`grid gap-1.5 ${className}`}>
      {label ? <span className={CONTROL_LABEL_CLASS}>{label}</span> : null}
      <div
        role="radiogroup"
        aria-label={typeof label === 'string' ? label : undefined}
        className={`relative h-12 border border-app-border bg-app-bg/55 p-1 ${CONTROL_RADIUS} ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 rounded-lg bg-app-accent shadow-[0_6px_20px_rgb(var(--app-accent)/0.16)] transition-all duration-200 ease-out"
          style={indicatorStyle}
        />
        <div className="relative z-10 grid h-full" style={gridStyle}>
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled || option.disabled}
                className={`h-full px-3 text-sm font-semibold transition ${active ? 'text-white' : 'text-app-muted hover:text-app-ink'} disabled:cursor-not-allowed`}
                onClick={() => onChange?.(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
