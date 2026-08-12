import type { TorznabRequest } from '@/services/torznab/types'
import type { MediaIdentity, MediaType } from '@/utils/types'

function isMovieCategory(categories: number[]): boolean {
  return categories.some((c) => c === 2000 || (c >= 2000 && c < 3000))
}

function isTvCategory(categories: number[]): boolean {
  return categories.some((c) => c === 5000 || (c >= 5000 && c < 6000))
}

export function resolveMediaType(req: TorznabRequest): MediaType {
  if (req.type === 'movie') return 'movie'
  if (req.type === 'tvsearch') return 'series'
  if (isMovieCategory(req.categories) && !isTvCategory(req.categories)) return 'movie'
  if (isTvCategory(req.categories)) return 'series'
  // bare search: prefer series unless only movie ids present
  if (req.tvdbId != null) return 'series'
  if (req.tmdbId != null || req.imdbId) return 'movie'
  return 'series'
}

export function buildIdentityFromTorznab(req: TorznabRequest): MediaIdentity {
  return {
    mediaType: resolveMediaType(req),
    tvdbId: req.tvdbId,
    tmdbId: req.tmdbId,
    imdbId: req.imdbId,
    primaryTitle: req.q,
    year: req.year,
  }
}
