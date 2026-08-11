import { logger } from '@/utils/logger'
import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles, TitleAlias } from '../media-schema'
import type { AliasProvider, AliasProviderResult } from './types'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function tmdbFetch(path: string, apiKey: string, language?: string): Promise<any | null> {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', apiKey)
  if (language) url.searchParams.set('language', language)
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    logger.warn({ path, status: res.status }, 'tmdb fetch failed')
    return null
  }
  return res.json()
}

function buildAliases(zhTitle: string | undefined, defaultTitle: string | undefined, original: string | undefined): TitleAlias[] {
  const aliases: TitleAlias[] = []
  const push = (title: string | undefined, type: TitleAlias['type'], script: TitleAlias['script'], priority: number) => {
    if (!title?.trim()) return
    if (aliases.some((a) => a.title === title.trim())) return
    aliases.push({ title: title.trim(), type, script, priority, verified: false })
  }
  push(zhTitle, 'translation', 'simplified', 100)
  push(original, 'original', /[\u4e00-\u9fff]/.test(original ?? '') ? 'simplified' : 'latin', 95)
  push(defaultTitle, 'official', 'latin', 90)
  return aliases
}

export function createTmdbProvider(apiKey?: string): AliasProvider {
  return {
    name: 'tmdb',
    async lookup(identity: MediaIdentity): Promise<AliasProviderResult> {
      if (!apiKey) return { media: null, source: 'tmdb' }

      try {
        if (identity.mediaType === 'series') {
          let tmdbId = identity.tmdbId
          if (tmdbId == null && identity.tvdbId != null) {
            const found = await tmdbFetch(`/find/${identity.tvdbId}?external_source=tvdb_id`, apiKey)
            tmdbId = found?.tv_results?.[0]?.id
          }
          if (tmdbId == null) return { media: null, source: 'tmdb' }

          const [zh, en] = await Promise.all([tmdbFetch(`/tv/${tmdbId}`, apiKey, 'zh-CN'), tmdbFetch(`/tv/${tmdbId}`, apiKey)])
          if (!zh && !en) return { media: null, source: 'tmdb' }
          const primary = zh?.name || en?.name || identity.primaryTitle || 'Unknown'
          const media: MediaTitles = {
            mediaId: `tmdb-tv:${tmdbId}`,
            mediaType: 'series',
            primaryTitle: primary,
            originalLanguage: zh?.original_language || en?.original_language,
            aliases: buildAliases(zh?.name, en?.name, zh?.original_name || en?.original_name),
            updatedAt: new Date().toISOString(),
            tvdbId: identity.tvdbId,
            tmdbId,
            sources: ['tmdb'],
          }
          return { media, source: 'tmdb' }
        }

        let tmdbId = identity.tmdbId
        if (tmdbId == null && identity.imdbId) {
          const found = await tmdbFetch(`/find/${identity.imdbId}?external_source=imdb_id`, apiKey)
          tmdbId = found?.movie_results?.[0]?.id
        }
        if (tmdbId == null) return { media: null, source: 'tmdb' }

        const [zh, en] = await Promise.all([tmdbFetch(`/movie/${tmdbId}`, apiKey, 'zh-CN'), tmdbFetch(`/movie/${tmdbId}`, apiKey)])
        if (!zh && !en) return { media: null, source: 'tmdb' }
        const primary = zh?.title || en?.title || identity.primaryTitle || 'Unknown'
        const media: MediaTitles = {
          mediaId: `tmdb:${tmdbId}`,
          mediaType: 'movie',
          primaryTitle: primary,
          originalLanguage: zh?.original_language || en?.original_language,
          aliases: buildAliases(zh?.title, en?.title, zh?.original_title || en?.original_title),
          updatedAt: new Date().toISOString(),
          tmdbId,
          imdbId: identity.imdbId || zh?.imdb_id || en?.imdb_id,
          sources: ['tmdb'],
        }
        return { media, source: 'tmdb' }
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'tmdb provider error')
        return { media: null, source: 'tmdb' }
      }
    },
  }
}
