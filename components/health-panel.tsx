'use client'

import { useEffect, useState } from 'react'

import { Skeleton } from '@/components/ui'

type Health = { status: string; prowlarr: string; database: string; version: string; runtime?: string }

export function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Health check returned ${res.status}`)
        return (await res.json()) as Health
      })
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Health check failed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const serviceOk = health?.status === 'ok'
  const prowlarrOk = health?.prowlarr === 'reachable'

  return (
    <section className="ui-panel overflow-hidden p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="ui-section-title">System health</h2>
          <p className="mt-2 text-sm text-app-muted">Live status from this deployment</p>
        </div>
        {!health && !error ? (
          <Skeleton className="h-8 w-24" rounded="full" />
        ) : (
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${error ? 'bg-app-dangerSoft text-app-danger' : 'bg-app-successSoft text-app-success'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-app-danger' : 'bg-app-success'}`} />
            {error ? 'Degraded' : 'Operational'}
          </span>
        )}
      </div>
      {error ? <p className="mb-4 rounded-xl border border-app-danger/20 bg-app-dangerSoft px-3 py-2 text-sm text-app-danger">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {!health && !error ? (
          [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[74px]" rounded="lg" />)
        ) : (
          <>
            <StatusItem label="Service" value={health?.status ?? '—'} ok={serviceOk} />
            <StatusItem label="Prowlarr" value={health?.prowlarr ?? '—'} ok={prowlarrOk} bad={Boolean(health && !prowlarrOk)} />
            <StatusItem label="Runtime" value={health?.runtime ?? 'vercel'} />
            <StatusItem label="Version" value={health?.version ?? '0.1.0'} />
          </>
        )}
      </div>
    </section>
  )
}

function StatusItem({ label, value, ok, bad }: { label: string; value: string; ok?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border/70 bg-app-bg/50 p-3.5">
      <span className="ui-label block">{label}</span>
      <span className={`mt-2 block truncate text-sm font-semibold ${ok ? 'text-app-success' : bad ? 'text-app-danger' : 'text-app-ink'}`}>{value}</span>
    </div>
  )
}
