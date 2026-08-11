import type { getAppRuntime } from '@/services/app/runtime'
import { buildIdentityFromTorznab } from '@/services/media/identity'
import { deduplicateResults } from '@/services/search/deduplicator'
import { generateQueries } from '@/services/search/query-generator'
import { filterRelevantResults } from '@/services/search/relevance'
import type { SearchResult } from '@/services/search/types'
import type { MediaType } from '@/utils/types'

export interface DebugSearchInput {
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  season?: number
  episode?: number
  year?: number
  q?: string
  mediaType?: MediaType
}

export interface DebugSearchOutput {
  mediaType: MediaType
  sources: string[]
  media: {
    primaryTitle: string | null
    aliases: string[]
    originalLanguage?: string
  }
  titles: string[]
  queries: string[]
  prowlarrReachable: boolean
  resultCount: number
  deduplicatedCount: number
  results: Array<Pick<SearchResult, 'title' | 'indexerName' | 'size' | 'seeders' | 'guid'>>
  hint?: string
}

type AppRuntimeLike = Awaited<ReturnType<typeof getAppRuntime>>

export async function runDebugSearch(runtime: AppRuntimeLike, input: DebugSearchInput): Promise<DebugSearchOutput> {
  const mediaType = input.mediaType ?? (input.tvdbId != null ? 'series' : input.tmdbId != null || input.imdbId ? 'movie' : 'series')
  const req = {
    type: (mediaType === 'movie' ? 'movie' : 'tvsearch') as 'movie' | 'tvsearch',
    q: input.q,
    season: input.season,
    ep: input.episode,
    year: input.year,
    tvdbId: input.tvdbId,
    tmdbId: input.tmdbId,
    imdbId: input.imdbId,
    categories: mediaType === 'movie' ? [2000] : [5000],
    limit: runtime.env.SEARCH_RESULT_LIMIT,
    offset: 0,
  }

  const identity = buildIdentityFromTorznab(req)
  const { titles, media, sources } = await runtime.resolveForRequest(req)
  const queries = generateQueries({
    titles,
    season: input.season,
    episode: input.episode,
    year: input.year,
    mediaType: identity.mediaType,
    maxFormatsPerTitle: runtime.env.MAX_QUERY_FORMATS_PER_TITLE,
    maxQueries: runtime.env.MAX_PROWLARR_QUERIES,
  })

  const prowlarrReachable = runtime.prowlarr ? await runtime.prowlarr.ping() : false
  const batches = await Promise.all(queries.map((query) => runtime.indexers.search(query, { categories: req.categories, mediaType })))
  const raw = batches.flat()
  const deduped = filterRelevantResults(deduplicateResults(raw), titles).slice(0, runtime.env.SEARCH_RESULT_LIMIT)

  let hint: string | undefined
  if (!prowlarrReachable) {
    hint = 'Prowlarr is unavailable. Configure its URL in Admin and its API key in the environment.'
  } else if (deduped.length === 0) {
    hint = 'Prowlarr is reachable, but this probe returned no results.'
  }

  return {
    mediaType: identity.mediaType,
    sources,
    media: {
      primaryTitle: media?.primaryTitle ?? input.q ?? null,
      aliases: media?.aliases.map((a) => a.title) ?? [],
      originalLanguage: media?.originalLanguage,
    },
    titles,
    queries,
    prowlarrReachable,
    resultCount: raw.length,
    deduplicatedCount: deduped.length,
    results: deduped.slice(0, 20).map((r) => ({
      title: r.title,
      indexerName: r.indexerName,
      size: r.size,
      seeders: r.seeders,
      guid: r.guid,
    })),
    hint,
  }
}
