import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

import { CONTROL_RADIUS } from './controlStyles'

type Variant = 'primary' | 'ghost'
type Size = 'md' | 'sm'

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'border-app-accent bg-app-accent text-white shadow-[0_10px_28px_rgb(var(--app-accent)/0.16)] hover:-translate-y-0.5 hover:bg-[#ff8259]',
  ghost: 'border-app-border bg-app-surface/60 text-app-text hover:-translate-y-0.5 hover:border-app-muted hover:bg-app-subtle',
}

const sizeClass: Record<Size, string> = {
  md: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-2 text-xs',
}

export function ButtonLink(props: ButtonLinkProps) {
  const { variant = 'primary', size = 'md', className = '', children, ...rest } = props
  return (
    <Link
      className={['inline-flex items-center justify-center border font-semibold transition duration-200', CONTROL_RADIUS, variantClass[variant], sizeClass[size], className].join(
        ' '
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}
