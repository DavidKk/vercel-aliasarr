import type { MemoryCache } from '@/services/cache/memory-cache'
import { getEnv } from '@/utils/env'
import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles } from '../media-schema'
import { createBangumiProvider } from './bangumi'
import { cacheMediaInGist, createGistYamlProvider } from './gist-yaml'
import { createTmdbProvider } from './tmdb'
import { aliasCacheKey, type AliasProvider, mergeMediaTitles } from './types'

export interface ResolveMediaTitlesResult {
  media: MediaTitles | null
  sources: string[]
}

export interface AliasProviderChainConfig {
  tmdbApiKey?: string
  bangumiAccessToken?: string
  gist?: { gistId: string; gistToken: string }
}

export function createAliasProviderChain(cache: MemoryCache, config: AliasProviderChainConfig = {}) {
  const tmdb = createTmdbProvider(config.tmdbApiKey)
  const bangumi = createBangumiProvider(config.bangumiAccessToken)
  const gist = createGistYamlProvider(config.gist)
  const providers: AliasProvider[] = [gist, tmdb, bangumi]

  return {
    async resolve(identity: MediaIdentity): Promise<ResolveMediaTitlesResult> {
      const env = getEnv()
      const key = aliasCacheKey(identity)
      const cached = await cache.get<ResolveMediaTitlesResult>(key)
      if (cached) return cached

      // Gist is both the persistent cache and the user-maintained source of truth.
      const gistResult = await gist.lookup(identity)
      if (gistResult.media) {
        const result: ResolveMediaTitlesResult = { media: gistResult.media, sources: ['gist'] }
        await cache.set(key, result, env.ALIAS_CACHE_TTL_MS)
        return result
      }

      const collected: MediaTitles[] = []
      const sources: string[] = []
      let hints: string[] = identity.primaryTitle ? [identity.primaryTitle] : []

      // Gist miss: resolve from remote metadata providers.
      const tmdbResult = await tmdb.lookup(identity)
      if (tmdbResult.media) {
        collected.push(tmdbResult.media)
        sources.push('tmdb')
        hints = [tmdbResult.media.primaryTitle, ...tmdbResult.media.aliases.map((a) => a.title)]
      }

      // Bangumi enrichment
      const bgmResult = await bangumi.lookup(identity, { titles: hints })
      if (bgmResult.media) {
        collected.push(bgmResult.media)
        sources.push('bangumi')
      }

      const media = mergeMediaTitles(collected)
      const result: ResolveMediaTitlesResult = { media, sources: [...new Set(sources)] }
      if (media) await cacheMediaInGist(identity, media, config.gist)
      await cache.set(key, result, env.ALIAS_CACHE_TTL_MS)
      return result
    },

    async invalidate(identity: MediaIdentity) {
      await cache.delete(aliasCacheKey(identity))
    },

    providers,
  }
}

export type AliasProviderChain = ReturnType<typeof createAliasProviderChain>
