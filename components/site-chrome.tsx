import Link from 'next/link'
import type { ReactNode } from 'react'

import { BrandLockup } from '@/components/brand-lockup'
import { PageHeader } from '@/components/page-header'

export function SiteNav() {
  return (
    <nav className="ui-fade-up mb-12 flex items-center justify-between gap-4 rounded-2xl border border-app-border/70 bg-app-surface/65 p-2.5 shadow-[0_18px_60px_rgb(0_0_0/0.18)] backdrop-blur-xl sm:rounded-full sm:pl-4">
      <BrandLockup variant="site" priority />
      <div className="flex items-center gap-2">
        <Link href="/docs" className="ui-nav-link whitespace-nowrap">
          Docs
        </Link>
        <Link href="/login" className="ui-nav-link whitespace-nowrap">
          Sign in
        </Link>
      </div>
    </nav>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return <main className="ui-shell">{children}</main>
}

export { PageHeader }
