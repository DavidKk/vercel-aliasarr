'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { AdminPageHeader } from '@/components/admin-chrome'
import { AdminCard } from '@/components/admin-layout'
import { Button, Skeleton, Textarea, useNotification } from '@/components/ui'

export default function AdminAliasesPage() {
  const router = useRouter()
  const notification = useNotification()
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [revision, setRevision] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/aliases')
      const json = await res.json()
      if (!res.ok || json.code !== 0) {
        if (res.status === 401) {
          router.push('/login?redirectUrl=/admin/aliases')
          return
        }
        throw new Error(json.message ?? 'Failed to load')
      }
      setFiles(json.data.files as string[])
    } catch (err) {
      notification.error(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [notification, router])

  useEffect(() => {
    void loadList()
  }, [loadList])

  async function openFile(path: string) {
    setSelected(path)
    try {
      const res = await fetch(`/api/aliases/${path}`)
      const json = await res.json()
      if (!res.ok || json.code !== 0) throw new Error(json.message ?? 'Failed to read')
      setContent(json.data.content as string)
      setRevision(json.data.revision as string)
    } catch (err) {
      notification.error(err instanceof Error ? err.message : 'Failed to read')
    }
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/aliases/${selected}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, revision }),
      })
      const json = await res.json()
      if (!res.ok || json.code !== 0) throw new Error(json.message ?? 'Failed to save')
      setRevision(json.data.revision as string)
      notification.success('Saved to Gist')
      await loadList()
    } catch (err) {
      notification.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-col lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <div className="shrink-0">
        <AdminPageHeader
          eyebrow="Data / Source management"
          title="Alias library"
          description="Files: series-tvdb-*.yaml, movies-tmdb-*.yaml. YAML is validated against the media schema before save."
        />
      </div>

      <div className="mb-4 grid shrink-0 gap-4 sm:grid-cols-3">
        <LibrarySummary label="Available files" value={loading ? null : String(files.length)} />
        <LibrarySummary label="Storage provider" value="GitHub Gist" />
        <LibrarySummary label="Document format" value="YAML" accent />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <AdminCard className="ui-fade-up flex min-h-0 flex-col overflow-hidden">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <h2 className="ui-label">Files</h2>
            <Button variant="ghost" size="sm" onClick={() => void loadList()}>
              Refresh
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2 py-1">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-12 w-full" rounded="lg" />
              ))}
            </div>
          ) : null}
          <ul className="min-h-0 flex-1 space-y-1 overflow-auto overscroll-contain pb-1 pr-1 pt-1 text-sm">
            {files.map((f) => (
              <li key={f}>
                <Button variant={selected === f ? 'primary' : 'ghost'} size="sm" className="w-full justify-start normal-case tracking-normal" onClick={() => void openFile(f)}>
                  <span className="truncate font-mono text-xs">{f}</span>
                </Button>
              </li>
            ))}
            {!loading && files.length === 0 ? <li className="text-xs text-app-muted">No series-* or movies-* files in Gist</li> : null}
          </ul>
          <p className="mt-3 shrink-0 text-xs text-app-muted">Add files in Gist, then refresh — or edit an existing path and save.</p>
        </AdminCard>

        <AdminCard className="ui-fade-up flex min-h-0 flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-app-border/70 pb-4">
            <div className="min-w-0">
              <p className="ui-label mb-1">YAML editor</p>
              <h2 className="truncate font-mono text-xs text-app-ink">{selected ?? 'Select a file to begin'}</h2>
            </div>
            <Button disabled={!selected || saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save to Gist'}
            </Button>
          </div>
          {loading ? (
            <Skeleton className="min-h-0 flex-1" rounded="lg" />
          ) : (
            <Textarea
              className="!min-h-0 flex-1 !resize-none overflow-auto overscroll-contain"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!selected}
              spellCheck={false}
              wrap="off"
            />
          )}
        </AdminCard>
      </div>
    </div>
  )
}

function LibrarySummary({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border/70 bg-app-surface/55 px-4 py-3">
      <span className="ui-label block">{label}</span>
      {value == null ? <Skeleton className="mt-2 h-5 w-12" /> : <span className={`mt-2 block text-sm font-semibold ${accent ? 'text-app-accent' : 'text-app-ink'}`}>{value}</span>}
    </div>
  )
}
