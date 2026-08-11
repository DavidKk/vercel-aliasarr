import Link from 'next/link'

import { BrandLogo } from '@/components/brand-logo'

export function BrandLockup({
  variant = 'site',
  href = '/',
  logoHeight = 36,
  priority = false,
  className = '',
}: {
  variant?: 'site' | 'admin'
  href?: string
  logoHeight?: number
  priority?: boolean
  className?: string
}) {
  return (
    <Link href={href} className={`group flex shrink-0 items-center gap-3 ${className}`} aria-label={variant === 'admin' ? 'Return to Aliasarr overview' : 'Aliasarr home'}>
      <BrandLogo height={logoHeight} className="rounded-md transition group-hover:rotate-3" priority={priority} />
      {variant === 'admin' ? (
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-app-ink">
            Aliasarr <span className="rounded bg-app-accentSoft px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-wider text-app-accent">Admin</span>
          </span>
          <span className="mt-0.5 block text-[0.64rem] text-app-muted">Control center</span>
        </span>
      ) : (
        <span className="hidden sm:block">
          <span className="block font-display text-sm font-semibold tracking-tight text-app-ink">Aliasarr</span>
          <span className="block font-mono text-[0.54rem] uppercase tracking-[0.16em] text-app-muted">Media alias engine</span>
        </span>
      )}
    </Link>
  )
}
