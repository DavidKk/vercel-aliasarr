import Link from 'next/link'
import type { ReactNode } from 'react'

export function SiteNav({ active }: { active?: 'home' | 'admin' }) {
  return (
    <nav className="mb-8 flex items-center justify-between gap-4">
      <Link href="/" className="inline-flex items-baseline gap-2 font-semibold tracking-tight">
        Aliasarr
        <span className="font-mono text-xs font-medium uppercase tracking-wider text-app-accent">on Vercel</span>
      </Link>
      <div className="flex items-center gap-4 text-sm text-app-muted">
        <Link href="/" className={active === 'home' ? 'text-app-text' : 'hover:text-app-text'}>
          首页
        </Link>
        <Link href="/admin" className={active === 'admin' ? 'text-app-text' : 'hover:text-app-text'}>
          试搜
        </Link>
        <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-app-text">
          Health
        </a>
      </div>
    </nav>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="relative z-10 mx-auto w-[min(1080px,calc(100%-2rem))] py-5 pb-12">{children}</div>
}
