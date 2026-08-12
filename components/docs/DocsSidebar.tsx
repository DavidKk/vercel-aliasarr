'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DOCS_NAV } from '@/components/docs/constants'
import { ButtonLink } from '@/components/ui'

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="ui-panel ui-fade-up h-fit p-3 lg:sticky lg:top-6">
      <p className="ui-label mb-3">Docs</p>
      <nav className="flex flex-col gap-1">
        {DOCS_NAV.map((section) => {
          const active = pathname === section.href
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`border px-2 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] transition-colors ${active ? 'border-app-accent/40 bg-app-accentSoft text-app-accent' : 'border-transparent text-app-muted hover:border-app-border hover:text-app-ink'}`}
            >
              {section.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-4 flex flex-col gap-2 border-t border-app-border pt-3">
        <ButtonLink href="/api/health" variant="ghost" className="w-full text-center">
          Health
        </ButtonLink>
        <ButtonLink href="/admin" variant="ghost" className="w-full text-center">
          Console
        </ButtonLink>
      </div>
    </aside>
  )
}
