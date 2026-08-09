'use client'

import { useEffect, useState } from 'react'

type Health = {
  status: string
  prowlarr: string
  database: string
  version: string
  runtime?: string
}

export function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(`health ${res.status}`)
        return (await res.json()) as Health
      })
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'health failed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-2xl border border-app-border bg-app-surface/80 p-5 shadow-sm backdrop-blur">
      <h2 className="mb-3 text-base font-semibold tracking-tight">运行状态</h2>
      {error ? <p className="mb-3 text-sm text-app-danger">{error}</p> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <StatusItem label="Service" value={health?.status ?? 'loading…'} ok={health?.status === 'ok'} />
        <StatusItem label="Prowlarr" value={health?.prowlarr ?? 'loading…'} ok={health?.prowlarr === 'reachable'} bad={Boolean(health && health.prowlarr !== 'reachable')} />
        <StatusItem label="Runtime" value={health?.runtime ?? 'vercel'} />
        <StatusItem label="Version" value={health?.version ?? '0.1.0'} />
      </div>
    </section>
  )
}

function StatusItem({ label, value, ok, bad }: { label: string; value: string; ok?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border bg-white/50 px-3 py-3">
      <span className="mb-1 block font-mono text-[0.7rem] uppercase tracking-wider text-app-muted">{label}</span>
      <span className={`font-semibold ${ok ? 'text-app-success' : bad ? 'text-app-danger' : ''}`}>{value}</span>
    </div>
  )
}
