import type { MediaIdentity } from '@/utils/types'
import type { TorznabRequest } from '@/services/torznab/types'

export function buildIdentityFromTorznab(req: TorznabRequest): MediaIdentity {
  return {
    mediaType: 'series',
    tvdbId: req.tvdbId,
    tmdbId: req.tmdbId,
    imdbId: req.imdbId,
    primaryTitle: req.q,
  }
}
