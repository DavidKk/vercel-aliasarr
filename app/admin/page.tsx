'use client'

import { useMemo, useState, type FormEvent } from 'react'

import { Shell, SiteNav } from '@/components/site-chrome'

type DebugResponse = {
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
}

function formatSize(size?: number) {
  if (size == null) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(2)} GB`
}

export default function AdminPage() {
  const [apikey, setApikey] = useState('local-dev-secret-key')
  const [tvdbId, setTvdbId] = useState('384640')
  const [season, setSeason] = useState('')
  const [episode, setEpisode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DebugResponse | null>(null)

  const canSubmit = useMemo(() => apikey.trim().length >= 16 && tvdbId.trim().length > 0, [apikey, tvdbId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/debug/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: apikey.trim(),
          tvdbId: Number(tvdbId),
          ...(season.trim() ? { season: Number(season) } : {}),
          ...(episode.trim() ? { episode: Number(episode) } : {}),
        }),
      })
      const json = (await res.json()) as DebugResponse
      if (!res.ok) {
        setData(null)
        setError(json.error ?? `请求失败 (${res.status})`)
        return
      }
      setData(json)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <SiteNav active="admin" />
      <header className="mb-6">
        <h1 className="mb-2 text-[clamp(2rem,5vw,2.8rem)] font-semibold tracking-tight">试搜控制台</h1>
        <p className="text-app-muted">
          默认示例：凡人修仙传（TVDB <code className="rounded bg-app-accentSoft px-1.5 py-0.5 font-mono text-sm">384640</code>
          ）。季/集可留空。
        </p>
      </header>

      <div className="grid gap-4">
        <section className="rounded-2xl border border-app-border bg-app-surface/80 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-3 text-base font-semibold">参数</h2>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <span className="font-mono text-xs uppercase tracking-wider text-app-muted">Torznab API Key</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={apikey}
                  onChange={(e) => setApikey(e.target.value)}
                  className="rounded-xl border border-app-border bg-white/70 px-3 py-2 outline-none focus:border-app-accent"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="font-mono text-xs uppercase tracking-wider text-app-muted">TVDB ID</span>
                <input
                  inputMode="numeric"
                  value={tvdbId}
                  onChange={(e) => setTvdbId(e.target.value)}
                  className="rounded-xl border border-app-border bg-white/70 px-3 py-2 outline-none focus:border-app-accent"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="font-mono text-xs uppercase tracking-wider text-app-muted">Season</span>
                <input
                  inputMode="numeric"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="rounded-xl border border-app-border bg-white/70 px-3 py-2 outline-none focus:border-app-accent"
                />
              </label>
              <label className="grid gap-1">
                <span className="font-mono text-xs uppercase tracking-wider text-app-muted">Episode</span>
                <input
                  inputMode="numeric"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  className="rounded-xl border border-app-border bg-white/70 px-3 py-2 outline-none focus:border-app-accent"
                />
              </label>
            </div>
            <div>
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex rounded-full bg-app-text px-5 py-3 text-sm font-medium text-app-surface disabled:opacity-50"
              >
                {loading ? '搜索中…' : '执行试搜'}
              </button>
            </div>
            {error ? <p className="text-sm text-app-danger">{error}</p> : null}
          </form>
        </section>

        {data ? (
          <>
            <section className="rounded-2xl border border-app-border bg-app-surface/80 p-5 shadow-sm backdrop-blur">
              <h2 className="mb-2 text-base font-semibold">媒体与别名</h2>
              <p className="mb-3 text-sm text-app-muted">
                {data.media.primaryTitle ?? '未找到别名配置'}
                {data.media.originalLanguage ? ` · ${data.media.originalLanguage}` : ''}
              </p>
              <ChipList items={data.media.aliases.length ? data.media.aliases : ['无 YAML 别名']} />
              <h2 className="mb-2 mt-4 text-base font-semibold">扩展标题</h2>
              <ChipList items={data.titles} />
            </section>

            <section className="rounded-2xl border border-app-border bg-app-surface/80 p-5 shadow-sm backdrop-blur">
              <h2 className="mb-2 text-base font-semibold">生成查询</h2>
              <ChipList items={data.queries} />
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                <Metric label="Prowlarr" value={data.prowlarrReachable ? 'reachable' : 'unreachable'} ok={data.prowlarrReachable} />
                <Metric label="Raw" value={String(data.resultCount)} />
                <Metric label="Deduped" value={String(data.deduplicatedCount)} />
              </div>
              {data.hint ? <p className="mt-3 text-sm text-app-danger">{data.hint}</p> : null}
            </section>

            <section className="rounded-2xl border border-app-border bg-app-surface/80 p-5 shadow-sm backdrop-blur">
              <h2 className="mb-3 text-base font-semibold">结果预览</h2>
              {data.results.length === 0 ? (
                <p className="text-sm text-app-muted">
                  无结果
                  {!data.prowlarrReachable ? '（因 Prowlarr 不可达；别名扩展本身已成功）' : '（空 RSS 对 Sonarr 仍合法）'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-app-border font-mono text-xs uppercase tracking-wider text-app-muted">
                        <th className="py-2 pr-2 font-medium">Title</th>
                        <th className="py-2 pr-2 font-medium">Indexer</th>
                        <th className="py-2 pr-2 font-medium">Size</th>
                        <th className="py-2 font-medium">Seeders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((r) => (
                        <tr key={r.guid} className="border-b border-app-border/70 align-top">
                          <td className="py-2 pr-2">{r.title}</td>
                          <td className="py-2 pr-2">{r.indexerName ?? '—'}</td>
                          <td className="py-2 pr-2">{formatSize(r.size)}</td>
                          <td className="py-2">{r.seeders ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  )
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-app-accent/20 bg-app-accentSoft px-2.5 py-1 font-mono text-xs">
          {item}
        </span>
      ))}
    </div>
  )
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border bg-white/50 px-3 py-3">
      <span className="mb-1 block font-mono text-[0.7rem] uppercase tracking-wider text-app-muted">{label}</span>
      <span className={`font-semibold ${ok === true ? 'text-app-success' : ok === false ? 'text-app-danger' : ''}`}>{value}</span>
    </div>
  )
}
