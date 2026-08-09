import { describe, expect, it } from 'vitest'
import { parseTorznabQuery } from '../../../services/torznab/parser'

describe('parseTorznabQuery', () => {
  it('parses tvsearch with ids and episode', () => {
    const params = new URLSearchParams({
      t: 'tvsearch',
      q: 'Joy of Life',
      season: '2',
      ep: '12',
      tvdbid: '366625',
      cat: '5000',
      apikey: 'secret',
      limit: '50',
    })
    const req = parseTorznabQuery(params)
    expect(req).toEqual({
      type: 'tvsearch',
      q: 'Joy of Life',
      season: 2,
      ep: 12,
      tvdbId: 366625,
      tmdbId: undefined,
      imdbId: undefined,
      categories: [5000],
      limit: 50,
      offset: 0,
      apikey: 'secret',
    })
  })

  it('rejects unsupported t', () => {
    expect(() => parseTorznabQuery(new URLSearchParams({ t: 'movie' }))).toThrow(/unsupported/i)
  })
})
