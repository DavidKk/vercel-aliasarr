import type { Metadata } from 'next'
import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'

import { DOCS_NAV } from '@/components/docs/constants'
import { DocsHashRedirect } from '@/components/docs/DocsHashRedirect'
import { DocsOverviewItem } from '@/components/docs/DocsOverviewItem'
import { PageHeader } from '@/components/site-chrome'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Aliasarr HTTP API, MCP endpoint, and agent Skill documentation.',
}

export default function DocsOverviewPage() {
  return (
    <>
      <DocsHashRedirect />
      <PageHeader eyebrow="Reference" title="Docs" description="HTTP API, MCP endpoint contract, and the agent Skill document — kept as separate surfaces." />
      <section className="ui-panel ui-fade-up p-5">
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-app-ink">Overview</h2>
        <p className="mb-4 text-sm leading-relaxed text-app-muted">
          Aliasarr exposes a Torznab indexer for *arr apps, Prowlarr/Jackett orchestration, a login-gated Gist YAML editor, an HTTP MCP endpoint for tools, and a Skill markdown
          resource for agents. Runtime configuration uses Upstash Redis in production and a local file in development; connection values are encrypted before persistence.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DocsOverviewItem term="Torznab" detail="GET /api/torznab/api" />
          <DocsOverviewItem term="Health" detail="GET /api/health" />
          <DocsOverviewItem term="Debug probe" detail="POST /api/debug/search" />
          <DocsOverviewItem term="MCP" detail="GET|POST /api/mcp" />
          <DocsOverviewItem term="Auth cookie" detail="POST|DELETE /api/auth" />
          <DocsOverviewItem term="Aliases" detail="GET|PUT|DELETE /api/aliases/…" />
          <DocsOverviewItem term="Configuration" detail="GET|PUT /api/config" />
        </dl>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {DOCS_NAV.filter((item) => item.href !== '/docs').map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-app-border/80 bg-app-subtle/40 px-3 py-3 text-sm text-app-ink transition hover:border-app-accent/40 hover:text-app-accent"
            >
              <span className="block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-app-muted">{item.label}</span>
              <span className="mt-1 flex items-center gap-1 font-medium">
                Open {item.label} docs
                <FiArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
