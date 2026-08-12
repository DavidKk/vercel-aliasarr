import type { MemoryCache } from '@/services/cache/memory-cache'
import type { IndexerClient } from '@/services/indexers'
import { buildIdentityFromTorznab } from '@/services/media/identity'
import type { TorznabRequest } from '@/services/torznab/types'
import { logger } from '@/utils/logger'

import { deduplicateResults } from './deduplicator'
import { filterRelevantResults } from './relevance'
import type { SearchResult } from './types'

export interface SearchServiceDeps {
  resolveTitlesForRequest: (req: TorznabRequest) => Promise<{ titles: string[] }>
  generateQueries: (input: {
    titles: string[]
    season?: number
    episode?: number
    year?: number
    mediaType?: 'series' | 'movie'
    maxFormatsPerTitle: number
    maxQueries: number
  }) => string[]
  indexers: Pick<IndexerClient, 'search'>
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
  const identity = buildIdentityFromTorznab(req)
  const categories = req.categories.toSorted((a, b) => a - b).join(',') || 'all'
  const scope = req.scope ? `:scope:${req.scope.provider}:${req.scope.indexerId}` : ''
  if (identity.mediaType === 'movie') {
    if (req.tmdbId != null) return `search:v4:movie:tmdb:${req.tmdbId}:y${req.year ?? 'x'}:c${categories}${scope}`
    if (req.imdbId) return `search:v4:movie:imdb:${req.imdbId}:y${req.year ?? 'x'}:c${categories}${scope}`
    return `search:v4:movie:q:${req.q ?? ''}:y${req.year ?? 'x'}:c${categories}${scope}`
  }
  if (req.tvdbId != null) {
    return `search:v4:tvdb:${req.tvdbId}:s${req.season ?? 'x'}:e${req.ep ?? 'x'}:c${categories}${scope}`
  }
  return `search:v4:q:${req.q ?? ''}:s${req.season ?? 'x'}:e${req.ep ?? 'x'}:c${categories}${scope}`
}

export function createSearchService(deps: SearchServiceDeps) {
  const hitTtlMs = deps.hitTtlMs ?? 15 * 60_000
  const emptyTtlMs = deps.emptyTtlMs ?? 2 * 60_000
  const maxFormatsPerTitle = deps.maxFormatsPerTitle ?? 2
  const maxQueries = deps.maxQueries ?? 6

  async function search(req: TorznabRequest): Promise<SearchResult[]> {
    const key = cacheKey(req)
    const cached = await deps.cache.get<SearchResult[]>(key)
    if (cached) return cached.slice(0, req.limit || deps.resultLimit)

    const identity = buildIdentityFromTorznab(req)
    const { titles } = await deps.resolveTitlesForRequest(req)
    const generatedQueries = deps.generateQueries({
      titles,
      season: req.season,
      episode: req.ep,
      year: req.year,
      mediaType: identity.mediaType,
      maxFormatsPerTitle,
      maxQueries,
    })
    // Sonarr/Radarr test an indexer with only `t` and `cat`. An empty query
    // asks Prowlarr for recent releases in those configured categories.
    const queries = generatedQueries.length > 0 ? generatedQueries : ['']

    // Network-bound: fan out query variants in parallel (wall time ≈ slowest upstream, not sum).
    const batches = await mapPool(queries, Math.max(deps.maxConcurrency, queries.length), (q) =>
      deps.indexers.search(q, { categories: req.categories, mediaType: identity.mediaType, scope: req.scope })
    )
    const merged = filterRelevantResults(deduplicateResults(batches.flat()), titles)
    const limited = merged.slice(0, deps.resultLimit)
    const byIndexer = batches.flat().reduce<Record<string, number>>((summary, result) => {
      const name = result.indexerName ?? (result.indexerId != null ? `#${result.indexerId}` : 'unknown')
      summary[name] = (summary[name] ?? 0) + 1
      return summary
    }, {})
    logger.info(
      {
        mediaType: identity.mediaType,
        queryCount: queries.length,
        categories: req.categories,
        upstreamResultCount: batches.reduce((total, batch) => total + batch.length, 0),
        resultCount: limited.length,
        byIndexer,
      },
      'upstream aggregate search'
    )
    await deps.cache.set(key, limited, limited.length === 0 ? emptyTtlMs : hitTtlMs)
    return limited.slice(0, req.limit || deps.resultLimit)
  }

  return {
    tvSearch: search,
    movieSearch: search,
    search,
  }
}
