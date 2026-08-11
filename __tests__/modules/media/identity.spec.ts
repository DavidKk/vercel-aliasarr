import { buildIdentityFromTorznab, resolveMediaType } from '../../../services/media/identity'
import type { TorznabRequest } from '../../../services/torznab/types'

function base(partial: Partial<TorznabRequest>): TorznabRequest {
  return {
    type: 'search',
    categories: [],
    limit: 100,
    offset: 0,
    ...partial,
  }
}

describe('identity', () => {
  it('maps movie type and categories', () => {
    expect(resolveMediaType(base({ type: 'movie' }))).toBe('movie')
    expect(resolveMediaType(base({ type: 'search', categories: [2000] }))).toBe('movie')
    expect(resolveMediaType(base({ type: 'tvsearch', tvdbId: 1 }))).toBe('series')
  })

  it('builds identity with year for movies', () => {
    const id = buildIdentityFromTorznab(base({ type: 'movie', tmdbId: 550, year: 1999, q: 'Fight Club' }))
    expect(id.mediaType).toBe('movie')
    expect(id.tmdbId).toBe(550)
    expect(id.year).toBe(1999)
  })
})
