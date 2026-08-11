import { createMemoryCache, type MemoryCache } from '@/services/cache/memory-cache'
import { type AliasarrSecrets, loadAliasarrConfig } from '@/services/config'
import { createIndexerClient, type IndexerClient } from '@/services/indexers'
import { createJackettClient } from '@/services/jackett'
import { buildIdentityFromTorznab } from '@/services/media/identity'
import type { MediaTitles } from '@/services/media/media-schema'
import { type AliasProviderChain, createAliasProviderChain } from '@/services/media/providers/resolve'
import { resolveTitles } from '@/services/media/title-resolver'
import { createProwlarrClient, type ProwlarrClient } from '@/services/prowlarr/client'
import { generateQueries } from '@/services/search/query-generator'
import { createSearchService } from '@/services/search/search-service'
import type { TorznabRequest } from '@/services/torznab/types'
import { type Env, getEnv } from '@/utils/env'

export interface AppRuntime {
  env: Env
  secrets: AliasarrSecrets
  prowlarr?: ProwlarrClient
  indexers: IndexerClient
  cache: MemoryCache
  aliasChain: AliasProviderChain
  searchService: ReturnType<typeof createSearchService>
  resolveForRequest(req: TorznabRequest): Promise<{
    titles: string[]
    media: MediaTitles | null
    sources: string[]
  }>
}

let singleton: AppRuntime | null = null
let envFingerprint: string | null = null

function fingerprint(env: Env, configRevision: string | null): string {
  return [
    configRevision ?? '',
    env.PROWLARR_INDEXER_IDS?.join(',') ?? '',
    env.PROWLARR_TV_INDEXER_IDS?.join(',') ?? '',
    env.PROWLARR_MOVIE_INDEXER_IDS?.join(',') ?? '',
    env.MAX_TITLES,
    env.MAX_PROWLARR_QUERIES,
  ].join('|')
}

export async function getAppRuntime(): Promise<AppRuntime> {
  const env = getEnv()
  const stored = await loadAliasarrConfig()
  const fp = fingerprint(env, stored.revision)
  if (singleton && envFingerprint === fp) {
    return singleton
  }

  envFingerprint = fp
  const prowlarrUrl = stored.config.connections.prowlarrUrl
  const prowlarrDownloadUrl = stored.config.connections.prowlarrDownloadUrl
  const jackettUrl = stored.config.connections.jackettUrl
  const prowlarr =
    prowlarrUrl && stored.secrets.prowlarrApiKey
      ? createProwlarrClient({
          baseUrl: prowlarrUrl,
          apiKey: stored.secrets.prowlarrApiKey,
          timeoutMs: env.PROWLARR_TIMEOUT_MS,
          mapOptions: prowlarrDownloadUrl
            ? {
                sonarrBaseUrl: prowlarrDownloadUrl,
                upstreamBaseUrl: prowlarrUrl,
              }
            : undefined,
        })
      : undefined
  const cache = createMemoryCache()
  const gist = stored.config.connections.gistId && stored.secrets.gistToken ? { gistId: stored.config.connections.gistId, gistToken: stored.secrets.gistToken } : undefined
  const aliasChain = createAliasProviderChain(cache, {
    tmdbApiKey: stored.secrets.tmdbApiKey,
    bangumiAccessToken: stored.secrets.bangumiAccessToken,
    gist,
  })
  const jackett =
    jackettUrl && stored.secrets.jackettApiKey ? createJackettClient({ baseUrl: jackettUrl, apiKey: stored.secrets.jackettApiKey, timeoutMs: env.JACKETT_TIMEOUT_MS }) : undefined
  const indexers = createIndexerClient({
    prowlarr,
    jackett,
    loadConfig: async () => {
      const current = await loadAliasarrConfig()
      return { config: current.config, exists: current.exists }
    },
    envProwlarrIds: {
      series: env.PROWLARR_TV_INDEXER_IDS ?? env.PROWLARR_INDEXER_IDS,
      movie: env.PROWLARR_MOVIE_INDEXER_IDS ?? env.PROWLARR_INDEXER_IDS,
    },
  })

  const runtime: AppRuntime = {
    env,
    secrets: stored.secrets,
    prowlarr,
    indexers,
    cache,
    aliasChain,
    searchService: null as unknown as ReturnType<typeof createSearchService>,
    resolveForRequest: async () => ({ titles: [], media: null, sources: [] }),
  }

  runtime.searchService = createSearchService({
    resolveTitlesForRequest: async (req) => {
      const { titles } = await runtime.resolveForRequest(req)
      return { titles }
    },
    generateQueries,
    indexers,
    maxConcurrency: env.PROWLARR_MAX_CONCURRENCY,
    resultLimit: env.SEARCH_RESULT_LIMIT,
    maxFormatsPerTitle: env.MAX_QUERY_FORMATS_PER_TITLE,
    maxQueries: env.MAX_PROWLARR_QUERIES,
    cache,
  })

  wireResolve(runtime)
  singleton = runtime
  return runtime
}

function wireResolve(runtime: AppRuntime) {
  runtime.resolveForRequest = async (req: TorznabRequest) => {
    const identity = buildIdentityFromTorznab(req)
    const { media, sources } = await runtime.aliasChain.resolve(identity)
    const resolved = resolveTitles(identity, media, {
      maxTitles: runtime.env.MAX_TITLES,
      enableScriptConvert: true,
    })
    return { titles: resolved.titles, media, sources }
  }
}

/** test-only */
export function resetAppRuntime(): void {
  singleton = null
  envFingerprint = null
}
