import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { CONTROL_RADIUS } from './controlStyles'

type Variant = 'primary' | 'ghost' | 'danger' | 'success'
type Size = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'border-app-accent bg-app-accent text-white shadow-[0_10px_28px_rgb(var(--app-accent)/0.16)] hover:-translate-y-0.5 hover:bg-[#ff8259]',
  ghost: 'border-app-border bg-app-surface/60 text-app-text hover:-translate-y-0.5 hover:border-app-muted hover:bg-app-subtle',
  danger: 'border-app-danger bg-app-danger text-white hover:-translate-y-0.5 hover:brightness-110',
  success: 'border-app-success/40 bg-app-successSoft text-app-success hover:-translate-y-0.5 hover:border-app-success/70',
}

const sizeClass: Record<Size, string> = {
  md: 'min-h-12 px-4 py-2.5 text-sm',
  sm: 'min-h-9 px-3 py-2 text-xs',
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className = '', type = 'button', children, ...rest } = props
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-1.5 border font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50',
        CONTROL_RADIUS,
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
