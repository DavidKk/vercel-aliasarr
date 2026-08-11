'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { FiArrowUpRight, FiLogOut } from 'react-icons/fi'

import { AdminScrollArea } from '@/components/admin-scroll-area'
import { BrandLockup } from '@/components/brand-lockup'
import { BrandLogo } from '@/components/brand-logo'
import { PageHeader } from '@/components/page-header'
import { StatusDot } from '@/components/status-dot'
import { useNotification } from '@/components/ui'

const workspaceLinks = [
  { href: '/admin', label: 'Dashboard', hint: 'System overview', mark: '01' },
  { href: '/admin/probe', label: 'Search probe', hint: 'Test query expansion', mark: '02' },
  { href: '/admin/aliases', label: 'Alias library', hint: 'Manage source records', mark: '03' },
  { href: '/admin/services', label: 'Services', hint: 'Gist, TMDB, Bangumi, API key', mark: '04' },
  { href: '/admin/indexers', label: 'Indexers', hint: 'Prowlarr and Jackett', mark: '05' },
  { href: '/admin/applications', label: 'Applications', hint: 'Sonarr and Radarr sync', mark: '06' },
] as const

function resolveAdminPage(pathname: string): string {
  if (pathname.startsWith('/admin/applications') || pathname.startsWith('/admin/config/applications')) return 'Applications'
  if (pathname.startsWith('/admin/indexers') || pathname.startsWith('/admin/config/indexers')) return 'Indexers'
  if (pathname.startsWith('/admin/services') || pathname.startsWith('/admin/config')) return 'Services'
  if (pathname.startsWith('/admin/aliases')) return 'Alias library'
  if (pathname.startsWith('/admin/probe')) return 'Search probe'
  return 'Dashboard'
}

export function AdminChrome({ children, username }: { children: ReactNode; username?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const notification = useNotification()
  const currentPage = resolveAdminPage(pathname)

  async function logout() {
    try {
      const response = await fetch('/api/auth', { method: 'DELETE' })
      if (!response.ok) throw new Error('Sign out failed')
      router.push('/login')
      router.refresh()
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Sign out failed')
    }
  }

  return (
    <main className="admin-root h-dvh overflow-hidden lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="admin-sidebar hidden h-dvh flex-col border-r border-app-border/70 lg:flex">
        <div className="flex h-20 items-center border-b border-app-border/70 px-6">
          <BrandLockup variant="admin" priority />
        </div>

        <nav className="flex-1 px-3 py-6">
          <p className="ui-label mb-3 px-3">Operations</p>
          <div className="space-y-1">
            {workspaceLinks.map((item) => {
              const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg border-l-2 px-3 py-3 transition ${active ? 'border-app-accent bg-app-subtle/80 text-app-ink' : 'border-transparent text-app-muted hover:bg-app-subtle/40 hover:text-app-ink'}`}
                >
                  <span className={`font-mono text-[0.6rem] ${active ? 'text-app-accent' : 'text-app-muted/60'}`}>{item.mark}</span>
                  <span>
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[0.62rem] text-app-muted">{item.hint}</span>
                  </span>
                </Link>
              )
            })}
          </div>

          <p className="ui-label mb-3 mt-8 px-3">Resources</p>
          <Link href="/docs" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs text-app-muted transition hover:bg-app-subtle/40 hover:text-app-ink">
            <span>Documentation</span>
            <FiArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
          <Link href="/docs/mcp" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs text-app-muted transition hover:bg-app-subtle/40 hover:text-app-ink">
            <span>MCP & Skill</span>
            <FiArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs text-app-muted transition hover:bg-app-subtle/40 hover:text-app-ink"
          >
            <span>Health endpoint</span>
            <FiArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
        </nav>

        <div className="m-3 rounded-xl border border-app-border/70 bg-app-bg/55 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[0.65rem] font-medium text-app-muted">Deployment</span>
            <StatusDot tone="success" label="Operational" className="text-[0.62rem] text-app-success" />
          </div>
          <div className="border-t border-app-border/60 pt-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-app-subtle text-xs font-semibold uppercase text-app-ink">{(username || 'A').slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-app-ink">{username || 'Administrator'}</p>
                <p className="text-[0.6rem] text-app-muted">Administrator</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-[0.58rem] font-medium text-app-muted/75 transition hover:bg-app-dangerSoft hover:text-app-danger"
              >
                <FiLogOut className="h-3 w-3" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
        <header className="admin-header z-30 flex h-16 shrink-0 items-center justify-between border-b border-app-border/70 px-4 backdrop-blur-xl sm:px-5 lg:h-20 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="shrink-0 lg:hidden" aria-label="Aliasarr home">
              <BrandLogo size={32} priority />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-xs text-app-muted">
                <span className="hidden sm:inline">Administration&nbsp; / &nbsp;</span>
                <span className="text-app-ink">{currentPage}</span>
              </p>
              <p className="mt-1 hidden font-mono text-[0.55rem] uppercase tracking-[0.14em] text-app-muted sm:block">Production workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-lg border border-app-border bg-app-surface/60 px-3 py-2 text-[0.65rem] text-app-muted sm:flex">
              <StatusDot tone="success" label="All systems normal" />
            </span>
            <Link href="/" className="rounded-lg border border-app-border px-3 py-2 text-xs text-app-muted transition hover:bg-app-subtle hover:text-app-ink">
              View site
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-app-border px-3 py-2 text-xs text-app-muted transition hover:bg-app-dangerSoft hover:text-app-danger lg:hidden"
            >
              Exit
            </button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-app-border/60 bg-app-surface/35 px-4 py-2 lg:hidden">
          {workspaceLinks.map((item) => {
            const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${active ? 'bg-app-subtle text-app-ink' : 'text-app-muted'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <AdminScrollArea className="admin-workspace p-4">
          <div className="w-full">{children}</div>
        </AdminScrollArea>
      </div>
    </main>
  )
}

export function AdminPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <PageHeader density="admin" eyebrow={eyebrow} title={title} description={description} />
}
