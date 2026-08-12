import type { MemoryCache } from '@/services/cache/memory-cache'
import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles } from '../media-schema'

export interface AliasProviderResult {
  media: MediaTitles | null
  source: string
}

export interface AliasProvider {
  readonly name: string
  lookup(identity: MediaIdentity, hints?: { titles?: string[] }): Promise<AliasProviderResult>
}

export function aliasCacheKey(identity: MediaIdentity): string {
  if (identity.mediaType === 'series') {
    if (identity.tvdbId != null) return `alias:series:tvdb:${identity.tvdbId}`
    if (identity.tmdbId != null) return `alias:series:tmdb:${identity.tmdbId}`
  } else {
    if (identity.tmdbId != null) return `alias:movie:tmdb:${identity.tmdbId}`
    if (identity.imdbId) return `alias:movie:imdb:${identity.imdbId.toLowerCase()}`
  }
  return `alias:${identity.mediaType}:q:${(identity.primaryTitle ?? '').toLowerCase()}:y${identity.year ?? 'x'}`
}

export function mergeMediaTitles(parts: MediaTitles[]): MediaTitles | null {
  if (parts.length === 0) return null
  const base = { ...parts[0]!, aliases: [...parts[0]!.aliases], sources: [...parts[0]!.sources] }
  for (const part of parts.slice(1)) {
    for (const src of part.sources) {
      if (!base.sources.includes(src)) base.sources.push(src)
    }
    if (!base.primaryTitle && part.primaryTitle) base.primaryTitle = part.primaryTitle
    if (!base.originalLanguage && part.originalLanguage) base.originalLanguage = part.originalLanguage
    if (base.tvdbId == null && part.tvdbId != null) base.tvdbId = part.tvdbId
    if (base.tmdbId == null && part.tmdbId != null) base.tmdbId = part.tmdbId
    if (!base.imdbId && part.imdbId) base.imdbId = part.imdbId

    for (const alias of part.aliases) {
      const existing = base.aliases.find((a) => a.title === alias.title)
      if (!existing) {
        base.aliases.push(alias)
        continue
      }
      // verified Gist aliases win over unverified remote metadata
      if (alias.verified && !existing.verified) {
        Object.assign(existing, alias)
      } else if (alias.verified === existing.verified && alias.priority > existing.priority) {
        Object.assign(existing, alias)
      }
    }
  }
  return base
}

export async function withAliasCache<T>(cache: MemoryCache, key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key)
  if (hit !== undefined && hit !== null) return hit
  const value = await fn()
  await cache.set(key, value, ttlMs)
  return value
}
