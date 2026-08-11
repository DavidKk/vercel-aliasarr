'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { AdminPageHeader } from '@/components/admin-chrome'
import { AdminCard, AdminStack } from '@/components/admin-layout'
import { AdminPageSkeleton } from '@/components/page-skeletons'

type DashboardState = {
  health: {
    status?: string
    prowlarr?: string
    database?: string
    runtime?: string
    version?: string
  } | null
  aliasCount: number | null
  aliasConfigured: boolean | null
  aliasError: boolean
}

const initialState: DashboardState = { health: null, aliasCount: null, aliasConfigured: null, aliasError: false }

export default function AdminOverviewPage() {
  const [state, setState] = useState<DashboardState>(initialState)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/health').then(async (response) => (response.ok ? response.json() : null)),
      fetch('/api/aliases').then(async (response) => (response.ok ? response.json() : null)),
    ])
      .then(([health, aliases]) => {
        if (cancelled) return
        setState({
          health,
          aliasCount: Array.isArray(aliases?.data?.files) ? aliases.data.files.length : null,
          aliasConfigured: typeof aliases?.data?.configured === 'boolean' ? aliases.data.configured : null,
          aliasError: !aliases,
        })
      })
      .catch(() => {
        if (!cancelled) setState((current) => ({ ...current, aliasError: true }))
      })

    return () => {
      cancelled = true
    }
  }, [])

  const serviceOk = state.health?.status === 'ok'
  const prowlarrOk = state.health?.prowlarr === 'reachable'
  const initialLoading = state.health == null && state.aliasConfigured == null && !state.aliasError

  if (initialLoading) return <AdminPageSkeleton cards={3} />

  return (
    <>
      <AdminPageHeader
        eyebrow="Administration / Overview"
        title="Dashboard"
        description="Monitor Aliasarr services, review configuration health, and access administrative tools."
      />

      <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Service status"
          value={state.health ? (serviceOk ? 'Operational' : 'Degraded') : 'Checking…'}
          detail="Public API and runtime"
          status={serviceOk ? 'ok' : state.health ? 'bad' : 'loading'}
        />
        <StatCard
          label="Prowlarr"
          value={state.health ? (prowlarrOk ? 'Connected' : 'Unavailable') : 'Checking…'}
          detail="Indexer aggregation"
          status={prowlarrOk ? 'ok' : state.health ? 'bad' : 'loading'}
        />
        <StatCard
          label="Alias records"
          value={state.aliasConfigured === false ? 'Not configured' : state.aliasCount == null ? (state.aliasError ? 'Unavailable' : 'Loading…') : String(state.aliasCount)}
          detail="YAML files in Gist"
          status={state.aliasConfigured === false || state.aliasError ? 'bad' : state.aliasCount == null ? 'loading' : 'neutral'}
        />
        <StatCard label="Runtime" value={state.health?.runtime ?? 'Vercel'} detail={`Version ${state.health?.version ?? '0.1.0'}`} status="neutral" />
      </section>

      <AdminStack>
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <AdminCard padded={false}>
            <div className="flex items-center justify-between border-b border-app-border/70 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-app-ink">System checks</h2>
                <p className="mt-1 text-xs text-app-muted">Current configuration and integration status</p>
              </div>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-app-muted">Live</span>
            </div>
            <div className="divide-y divide-app-border/60">
              <CheckRow
                name="Aliasarr API"
                description="Torznab, MCP and health routes"
                value={serviceOk ? 'Healthy' : state.health ? 'Needs attention' : 'Checking'}
                ok={serviceOk}
                loading={!state.health}
              />
              <CheckRow
                name="Prowlarr connection"
                description="Upstream indexer search provider"
                value={prowlarrOk ? 'Reachable' : state.health ? 'Unavailable' : 'Checking'}
                ok={prowlarrOk}
                loading={!state.health}
              />
              <CheckRow
                name="Alias data source"
                description="Authenticated GitHub Gist storage"
                value={state.aliasConfigured === false ? 'Not configured' : state.aliasCount != null ? `${state.aliasCount} files` : state.aliasError ? 'Unavailable' : 'Checking'}
                ok={state.aliasConfigured === true}
                loading={state.aliasConfigured == null && !state.aliasError}
              />
              <CheckRow name="Deployment runtime" description="Server execution environment" value={state.health?.runtime ?? 'Vercel'} ok />
            </div>
          </AdminCard>

          <AdminCard padded={false}>
            <div className="border-b border-app-border/70 px-5 py-4">
              <h2 className="text-sm font-semibold text-app-ink">Quick actions</h2>
              <p className="mt-1 text-xs text-app-muted">Common administration tasks</p>
            </div>
            <div className="space-y-2 p-3">
              <QuickAction href="/admin/probe" title="Run search probe" description="Inspect title expansion and results" mark="01" />
              <QuickAction href="/admin/aliases" title="Manage aliases" description="Edit YAML records in Gist" mark="02" />
              <QuickAction href="/docs" title="Open documentation" description="Review API and MCP contracts" mark="03" external />
            </div>
          </AdminCard>
        </div>

        <AdminCard padded={false} className="overflow-hidden">
          <div className="border-b border-app-border/70 px-5 py-4">
            <h2 className="text-sm font-semibold text-app-ink">Service endpoints</h2>
            <p className="mt-1 text-xs text-app-muted">Routes exposed by this deployment</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-app-bg/40 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-app-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Endpoint</th>
                  <th className="px-5 py-3 font-medium">Access</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/60 text-app-text">
                <EndpointRow name="Torznab indexer" endpoint="/api/torznab/api" access="API key" ok={serviceOk} />
                <EndpointRow name="MCP server" endpoint="/api/mcp" access="API key" ok={serviceOk} />
                <EndpointRow name="Health probe" endpoint="/api/health" access="Public" ok={serviceOk} />
                <EndpointRow name="Alias management" endpoint="/api/aliases" access="Admin session" ok={state.aliasConfigured === true} />
              </tbody>
            </table>
          </div>
        </AdminCard>
      </AdminStack>
    </>
  )
}

function StatCard({ label, value, detail, status }: { label: string; value: string; detail: string; status: 'ok' | 'bad' | 'loading' | 'neutral' }) {
  const dot = status === 'ok' ? 'bg-app-success' : status === 'bad' ? 'bg-app-danger' : status === 'loading' ? 'animate-pulse bg-app-warning' : 'bg-app-accent'
  return (
    <article className="rounded-xl border border-app-border/70 bg-app-surface/65 p-4">
      <div className="flex items-center justify-between">
        <span className="ui-label">{label}</span>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
      <p className="mt-5 text-xl font-semibold tracking-tight text-app-ink">{value}</p>
      <p className="mt-1 text-[0.65rem] text-app-muted">{detail}</p>
    </article>
  )
}

function CheckRow({ name, description, value, ok, loading }: { name: string; description: string; value: string; ok?: boolean; loading?: boolean }) {
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-xs font-semibold text-app-ink">{name}</p>
        <p className="mt-1 text-[0.65rem] text-app-muted">{description}</p>
      </div>
      <span
        className={`inline-flex w-fit items-center gap-2 rounded-md px-2 py-1 text-[0.62rem] font-medium ${loading ? 'bg-app-warningSoft text-app-warning' : ok ? 'bg-app-successSoft text-app-success' : 'bg-app-dangerSoft text-app-danger'}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-app-warning' : ok ? 'bg-app-success' : 'bg-app-danger'}`} />
        {value}
      </span>
    </div>
  )
}

function QuickAction({ href, title, description, mark, external }: { href: string; title: string; description: string; mark: string; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition hover:border-app-border hover:bg-app-subtle/50"
    >
      <span className="font-mono text-[0.6rem] text-app-accent">{mark}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-app-ink">{title}</span>
        <span className="mt-1 block truncate text-[0.63rem] text-app-muted">{description}</span>
      </span>
      <span className="text-app-muted transition group-hover:translate-x-0.5 group-hover:text-app-ink" aria-hidden>
        →
      </span>
    </Link>
  )
}

function EndpointRow({ name, endpoint, access, ok }: { name: string; endpoint: string; access: string; ok: boolean }) {
  return (
    <tr className="transition hover:bg-app-subtle/25">
      <td className="px-5 py-3.5 font-medium">{name}</td>
      <td className="px-5 py-3.5 font-mono text-[0.68rem] text-app-muted">{endpoint}</td>
      <td className="px-5 py-3.5 text-app-muted">{access}</td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 ${ok ? 'text-app-success' : 'text-app-danger'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-app-success' : 'bg-app-danger'}`} />
          {ok ? 'Available' : 'Attention'}
        </span>
      </td>
    </tr>
  )
}
