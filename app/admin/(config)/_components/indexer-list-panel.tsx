'use client'

import { type ReactNode, useMemo, useState } from 'react'

import { Skeleton } from '@/components/ui'

function IndexerListSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-busy="true">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-14 w-full" rounded="lg" />
      ))}
    </div>
  )
}

export function IndexerListPanel({
  discovering,
  items,
  emptyLabel,
}: {
  discovering: boolean
  items: Array<{ key: string; searchText: string; node: ReactNode }>
  emptyLabel: string
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => item.searchText.includes(needle))
  }, [items, query])

  return (
    <div className="mt-4">
      <input
        type="search"
        value={query}
        placeholder="Filter indexers…"
        aria-label="Filter indexers"
        disabled={discovering || items.length === 0}
        className="h-10 w-full rounded-xl border border-app-border bg-app-bg px-3 text-sm text-app-text outline-none placeholder:text-app-muted/60 focus:border-app-accent disabled:opacity-50"
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="mt-2 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-app-border/60 pr-1">
        {discovering ? (
          <div className="p-1">
            <IndexerListSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-app-muted">{emptyLabel}</p>
        ) : (
          <div className="space-y-1 p-1">
            {filtered.map((item) => (
              <div key={item.key}>{item.node}</div>
            ))}
          </div>
        )}
      </div>
      {!discovering && items.length > 0 ? (
        <p className="mt-2 text-[0.65rem] text-app-muted">
          Showing {filtered.length} of {items.length}
        </p>
      ) : null}
    </div>
  )
}
