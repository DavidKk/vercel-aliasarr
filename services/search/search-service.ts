import type { TorznabRequest } from '@/services/torznab/types'
import type { MemoryCache } from '@/services/cache/memory-cache'
import type { ProwlarrClient } from '@/services/prowlarr/client'
import { deduplicateResults } from './deduplicator'
import { filterRelevantResults } from './relevance'
import type { SearchResult } from './types'

export interface SearchServiceDeps {
  resolveTitlesForRequest: (req: TorznabRequest) => Promise<{ titles: string[] }>
  generateQueries: (input: { titles: string[]; season?: number; episode?: number; maxFormatsPerTitle: number; maxQueries: number }) => string[]
  prowlarr: Pick<ProwlarrClient, 'search'>
  maxConcurrency: number
  resultLimit: number
  maxFormatsPerTitle?: number
  maxQueries?: number
  cache: MemoryCache
  hitTtlMs?: number
  emptyTtlMs?: number
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!)
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => worker())
  await Promise.all(workers)
  return results
}

function cacheKey(req: TorznabRequest): string {
  if (req.tvdbId != null) {
    return `search:v2:tvdb:${req.tvdbId}:s${req.season ?? 'x'}:e${req.ep ?? 'x'}`
  }
  return `search:v2:q:${req.q ?? ''}:s${req.season ?? 'x'}:e${req.ep ?? 'x'}`
}

export function createSearchService(deps: SearchServiceDeps) {
  const hitTtlMs = deps.hitTtlMs ?? 15 * 60_000
  const emptyTtlMs = deps.emptyTtlMs ?? 2 * 60_000
  const maxFormatsPerTitle = deps.maxFormatsPerTitle ?? 2
  const maxQueries = deps.maxQueries ?? 6

  return {
    async tvSearch(req: TorznabRequest): Promise<SearchResult[]> {
      const key = cacheKey(req)
      const cached = await deps.cache.get<SearchResult[]>(key)
      if (cached) return cached.slice(0, req.limit || deps.resultLimit)

      const { titles } = await deps.resolveTitlesForRequest(req)
      const queries = deps.generateQueries({
        titles,
        season: req.season,
        episode: req.ep,
        maxFormatsPerTitle,
        maxQueries,
      })

      const batches = await mapPool(queries, deps.maxConcurrency, (q) => deps.prowlarr.search(q))
      const merged = filterRelevantResults(deduplicateResults(batches.flat()), titles)
      const limited = merged.slice(0, deps.resultLimit)
      await deps.cache.set(key, limited, limited.length === 0 ? emptyTtlMs : hitTtlMs)
      return limited.slice(0, req.limit || deps.resultLimit)
    },
  }
}
