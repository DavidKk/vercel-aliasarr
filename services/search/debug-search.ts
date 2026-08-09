import { getAppRuntime } from '@/services/app/runtime'
import { deduplicateResults } from '@/services/search/deduplicator'
import { generateQueries } from '@/services/search/query-generator'
import { filterRelevantResults } from '@/services/search/relevance'
import type { SearchResult } from '@/services/search/types'

export interface DebugSearchInput {
  tvdbId: number
  season?: number
  episode?: number
  q?: string
}

export interface DebugSearchOutput {
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

export async function runDebugSearch(runtime: AppRuntimeLike, input: DebugSearchInput): Promise<DebugSearchOutput> {
  const req = {
    type: 'tvsearch' as const,
    q: input.q,
    season: input.season,
    ep: input.episode,
    tvdbId: input.tvdbId,
    categories: [5000],
    limit: runtime.env.SEARCH_RESULT_LIMIT,
    offset: 0,
  }

  const { titles, media } = await runtime.resolveForRequest(req)
  const queries = generateQueries({
    titles,
    season: input.season,
    episode: input.episode,
    maxFormatsPerTitle: runtime.env.MAX_QUERY_FORMATS_PER_TITLE,
    maxQueries: runtime.env.MAX_PROWLARR_QUERIES,
  })

  const prowlarrReachable = await runtime.prowlarr.ping()
  const batches = await Promise.all(queries.map((query) => runtime.prowlarr.search(query)))
  const raw = batches.flat()
  const deduped = filterRelevantResults(deduplicateResults(raw), titles).slice(0, runtime.env.SEARCH_RESULT_LIMIT)

  let hint: string | undefined
  if (!prowlarrReachable) {
    hint = 'Prowlarr 不可达。请在 .env.local 配置真实的 PROWLARR_URL / PROWLARR_API_KEY，并确保本机可访问该地址后重启 pnpm dev。'
  } else if (deduped.length === 0) {
    hint = 'Prowlarr 可达，但本次查询无结果。可换季集或检查 Indexer 是否启用。'
  }

  return {
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

type AppRuntimeLike = Awaited<ReturnType<typeof getAppRuntime>>
