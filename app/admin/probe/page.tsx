'use client'

import { type FormEvent, useMemo, useState } from 'react'

import { AdminPageHeader } from '@/components/admin-chrome'
import { AdminCard, AdminStack } from '@/components/admin-layout'
import { Button, Input, Skeleton, Switch } from '@/components/ui'

type MediaType = 'series' | 'movie'

type DebugResponse = {
  mediaType?: string
  sources?: string[]
  media: {
    primaryTitle: string | null
    aliases: string[]
    originalLanguage?: string
  }
  titles: string[]
  queries: string[]
  prowlarrReachable?: boolean
  resultCount: number
  deduplicatedCount: number
  results: Array<{
    title: string
    indexerName?: string
    size?: number
    seeders?: number
    guid: string
  }>
  hint?: string
  error?: string
  message?: string
}

function formatSize(size?: number) {
  if (size == null) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(2)} GB`
}

function optionalPositiveInt(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined
}

function optionalNonNegInt(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined
}

export default function AdminProbePage() {
  const [mediaType, setMediaType] = useState<MediaType>('series')
  const [q, setQ] = useState('')
  const [tvdbId, setTvdbId] = useState('')
  const [tmdbId, setTmdbId] = useState('')
  const [imdbId, setImdbId] = useState('')
  const [season, setSeason] = useState('')
  const [episode, setEpisode] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DebugResponse | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(q.trim() || tvdbId.trim() || tmdbId.trim() || imdbId.trim())
  }, [q, tvdbId, tmdbId, imdbId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        mediaType,
      }
      if (q.trim()) body.q = q.trim()
      const tvdb = optionalPositiveInt(tvdbId)
      const tmdb = optionalPositiveInt(tmdbId)
      if (tvdb != null) body.tvdbId = tvdb
      if (tmdb != null) body.tmdbId = tmdb
      if (imdbId.trim()) body.imdbId = imdbId.trim()

      if (mediaType === 'series') {
        const s = optionalNonNegInt(season)
        const ep = optionalNonNegInt(episode)
        if (s != null) body.season = s
        if (ep != null) body.episode = ep
      } else {
        const y = optionalPositiveInt(year)
        if (y != null) body.year = y
      }

      const res = await fetch('/api/debug/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as DebugResponse
      if (!res.ok) {
        setData(null)
        setError(json.error ?? json.message ?? `Request failed (${res.status})`)
        return
      }
      setData(json)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations / Diagnostics"
        title="Search probe"
        description="Probe with a free-text title and/or TVDB / TMDB / IMDb IDs. Season–episode or year are optional."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <AdminSummary label="Module" value="Query diagnostics" />
        <AdminSummary label="Endpoint" value="/api/debug/search" mono />
        <AdminSummary label="Authentication" value="Admin session" accent />
      </div>

      <AdminStack>
        <AdminCard className="ui-fade-up">
          <div className="mb-6 flex items-center justify-between border-b border-app-border/70 pb-4">
            <div>
              <h2 className="text-base font-semibold text-app-ink">Search parameters</h2>
              <p className="mt-1 text-xs text-app-muted">Configure a request to inspect title expansion.</p>
            </div>
            <span className="rounded-full bg-app-accentSoft px-2.5 py-1 font-mono text-[0.62rem] text-app-accent">POST</span>
          </div>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Switch
                  label="Type"
                  value={mediaType}
                  onChange={(v) => setMediaType(v as MediaType)}
                  options={[
                    { label: 'Series', value: 'series' },
                    { label: 'Movie', value: 'movie' },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <Input label="Title (q)" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Mortal Journey / Joy of Life / Ne Zha" />
              </div>

              <Input label="TVDB ID" inputMode="numeric" value={tvdbId} onChange={(e) => setTvdbId(e.target.value)} placeholder="optional" />
              <Input label="TMDB ID" inputMode="numeric" value={tmdbId} onChange={(e) => setTmdbId(e.target.value)} placeholder="optional" />
              <div className="md:col-span-2">
                <Input label="IMDb ID" value={imdbId} onChange={(e) => setImdbId(e.target.value)} placeholder="optional, e.g. tt0137523" />
              </div>

              {mediaType === 'series' ? (
                <>
                  <Input label="Season" inputMode="numeric" value={season} onChange={(e) => setSeason(e.target.value)} />
                  <Input label="Episode" inputMode="numeric" value={episode} onChange={(e) => setEpisode(e.target.value)} />
                </>
              ) : (
                <Input label="Year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="optional" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!canSubmit || loading}>
                {loading ? 'Searching…' : 'Run probe'}
              </Button>
              {!canSubmit ? <p className="text-xs text-app-muted">Provide a title or at least one ID</p> : null}
            </div>
            {error ? (
              <p role="alert" className="rounded-xl border border-app-danger/20 bg-app-dangerSoft px-3 py-2.5 text-sm text-app-danger">
                {error}
              </p>
            ) : null}
          </form>
        </AdminCard>

        {loading ? (
          <ProbeResultsSkeleton />
        ) : data ? (
          <>
            <AdminCard className="ui-fade-up">
              <h2 className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-app-muted">Media & aliases</h2>
              <p className="mb-3 text-sm text-app-muted">
                {data.media.primaryTitle ?? 'No alias media resolved'}
                {data.media.originalLanguage ? ` · ${data.media.originalLanguage}` : ''}
                {data.mediaType ? ` · ${data.mediaType}` : ''}
                {data.sources?.length ? ` · sources: ${data.sources.join(', ')}` : ''}
              </p>
              <ChipList items={data.media.aliases.length ? data.media.aliases : ['No aliases']} />
              <h2 className="mb-2 mt-5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-app-muted">Expanded titles</h2>
              <ChipList items={data.titles} />
            </AdminCard>

            <AdminCard className="ui-fade-up">
              <h2 className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-app-muted">Generated queries</h2>
              <ChipList items={data.queries} />
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Metric label="Prowlarr" value={data.prowlarrReachable ? 'reachable' : 'unreachable'} ok={data.prowlarrReachable} />
                <Metric label="Raw" value={String(data.resultCount)} />
                <Metric label="Deduped" value={String(data.deduplicatedCount)} />
              </div>
              {data.hint ? <p className="mt-3 text-sm text-app-danger">{data.hint}</p> : null}
            </AdminCard>

            <AdminCard className="ui-fade-up overflow-hidden">
              <h2 className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-app-muted">Result preview</h2>
              {data.results.length === 0 ? (
                <p className="text-sm text-app-muted">
                  No results
                  {!data.prowlarrReachable ? ' (Prowlarr unreachable; alias expansion may still have succeeded)' : ' (empty RSS is still valid for *arr)'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-app-border font-mono text-[0.65rem] uppercase tracking-[0.14em] text-app-muted">
                        <th className="py-2 pr-2 font-medium">Title</th>
                        <th className="py-2 pr-2 font-medium">Indexer</th>
                        <th className="py-2 pr-2 font-medium">Size</th>
                        <th className="py-2 font-medium">Seeders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((r) => (
                        <tr key={r.guid} className="border-b border-app-border/70 align-top transition hover:bg-app-subtle/35">
                          <td className="py-2.5 pr-2">{r.title}</td>
                          <td className="py-2.5 pr-2 font-mono text-xs">{r.indexerName ?? '—'}</td>
                          <td className="py-2.5 pr-2 font-mono text-xs">{formatSize(r.size)}</td>
                          <td className="py-2.5 font-mono text-xs">{r.seeders ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCard>
          </>
        ) : null}
      </AdminStack>
    </>
  )
}

function ProbeResultsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading probe results">
      {[0, 1, 2].map((item) => (
        <AdminCard key={item}>
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 w-24" rounded="full" />
            <Skeleton className="h-8 w-32" rounded="full" />
            <Skeleton className="h-8 w-20" rounded="full" />
          </div>
          {item === 2 ? <Skeleton className="mt-5 h-36 w-full" rounded="lg" /> : null}
        </AdminCard>
      ))}
    </div>
  )
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="ui-chip">
          {item}
        </span>
      ))}
    </div>
  )
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border/70 bg-app-bg/50 px-3 py-3">
      <span className="mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.14em] text-app-muted">{label}</span>
      <span className={`text-sm font-semibold ${ok === true ? 'text-app-success' : ok === false ? 'text-app-danger' : 'text-app-ink'}`}>{value}</span>
    </div>
  )
}

function AdminSummary({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border/70 bg-app-surface/55 px-4 py-3">
      <span className="ui-label block">{label}</span>
      <span className={`mt-2 block truncate text-sm font-semibold ${mono ? 'font-mono text-xs' : ''} ${accent ? 'text-app-accent' : 'text-app-ink'}`}>{value}</span>
    </div>
  )
}
