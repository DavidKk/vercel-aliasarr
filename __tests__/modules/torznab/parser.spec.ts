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
    expect(req).toMatchObject({
      type: 'tvsearch',
      q: 'Joy of Life',
      season: 2,
      ep: 12,
      tvdbId: 366625,
      categories: [5000],
      limit: 50,
      offset: 0,
      apikey: 'secret',
    })
  })

  it('parses movie with year', () => {
    const req = parseTorznabQuery(new URLSearchParams({ t: 'movie', tmdbid: '550', year: '1999', cat: '2000' }))
    expect(req.type).toBe('movie')
    expect(req.tmdbId).toBe(550)
    expect(req.year).toBe(1999)
  })

  it('rejects unsupported t', () => {
    expect(() => parseTorznabQuery(new URLSearchParams({ t: 'music' }))).toThrow(/unsupported/i)
  })
})
