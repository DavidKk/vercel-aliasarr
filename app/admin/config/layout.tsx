'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

import { ConfigContentSkeleton } from '@/components/page-skeletons'
import { Skeleton } from '@/components/ui'

import { ConfigProvider, useConfigForm } from './_components/config-provider'
import { Notice, StatusPill } from './_components/ui'
import styles from './config-nav.module.css'

const tabs = [
  { href: '/admin/config/services', label: 'Services' },
  { href: '/admin/config/indexers', label: 'Indexers' },
  { href: '/admin/config/applications', label: 'Applications' },
] as const

export default function ConfigLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ConfigShell>{children}</ConfigShell>
    </ConfigProvider>
  )
}

function ConfigShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { encrypted, error, loading, storage, storageConfigured } = useConfigForm()

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-app-border/70 bg-app-surface/40 p-1.5">
        <ConfigNav pathname={pathname} />
        <div className="flex items-center gap-2 px-1">
          {loading ? (
            <>
              <Skeleton className="h-6 w-24" rounded="full" />
              <Skeleton className="h-6 w-20" rounded="full" />
            </>
          ) : (
            <>
              <StatusPill ok={storageConfigured}>{storage === 'vercel-kv' ? 'Upstash Redis' : 'Local file'}</StatusPill>
              <StatusPill ok={encrypted}>{encrypted ? 'Encrypted' : 'Pending encryption'}</StatusPill>
            </>
          )}
        </div>
      </div>

      {!loading && !storageConfigured ? <Notice tone="danger">Connect Upstash Redis in the Vercel Marketplace to persist production configuration.</Notice> : null}
      {!loading && !encrypted ? <Notice tone="warning">Save any completed section to encrypt it now. Missing services can be configured later.</Notice> : null}
      {!loading && error ? <Notice tone="danger">{error}</Notice> : null}

      {loading ? <ConfigContentSkeleton /> : children}
    </>
  )
}

function ConfigNav({ pathname }: { pathname: string }) {
  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })
  const activeHref = tabs.find((tab) => pathname.startsWith(tab.href))?.href

  const moveTo = (href: string | undefined) => {
    const link = href ? linkRefs.current[href] : null
    if (!link) return
    setIndicator({ left: link.offsetLeft, width: link.offsetWidth, visible: true })
  }

  useLayoutEffect(() => {
    const syncActive = () => {
      const link = activeHref ? linkRefs.current[activeHref] : null
      if (!link) return
      setIndicator({ left: link.offsetLeft, width: link.offsetWidth, visible: true })
    }

    syncActive()
    window.addEventListener('resize', syncActive)
    return () => window.removeEventListener('resize', syncActive)
  }, [activeHref])

  return (
    <nav ref={navRef} aria-label="Configuration sections" className="relative flex gap-1 overflow-x-auto rounded-xl p-1" onPointerLeave={() => moveTo(activeHref)}>
      <span className={styles.activeWater} aria-hidden="true" style={{ left: indicator.left, width: indicator.width, visibility: indicator.visible ? 'visible' : 'hidden' }} />
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            ref={(node) => {
              linkRefs.current[tab.href] = node
            }}
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            onPointerEnter={() => moveTo(tab.href)}
            onFocus={() => moveTo(tab.href)}
            onBlur={() => moveTo(activeHref)}
            className={`relative z-10 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${active ? 'text-app-ink' : 'text-app-muted hover:text-app-ink'}`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
