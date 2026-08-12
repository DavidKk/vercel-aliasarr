import { handleTorznabRequest, parseTorznabIndexerScope, serveTorznabRequest } from '../../services/torznab/handler'

describe('handleTorznabRequest', () => {
  afterEach(() => {
    unstubAllEnvs()
  })

  it('parses scoped Torznab provider/indexer paths', () => {
    expect(parseTorznabIndexerScope('prowlarr', '12')).toEqual({ provider: 'prowlarr', indexerId: '12' })
    expect(parseTorznabIndexerScope('jackett', 'nyaa-si')).toEqual({ provider: 'jackett', indexerId: 'nyaa-si' })
    expect(parseTorznabIndexerScope('prowlarr', 'abc')).toBeNull()
    expect(parseTorznabIndexerScope('other', '1')).toBeNull()
  })

  it('forwards indexer scope into search requests', async () => {
    const search = jest.fn(async () => [])
    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab/prowlarr/12?t=tvsearch&q=test&apikey=0123456789abcdef'), {
      apiKey: '0123456789abcdef',
      searchService: { search },
      scope: { provider: 'prowlarr', indexerId: '12' },
    })
    expect(res.status).toBe(200)
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tvsearch',
        q: 'test',
        scope: { provider: 'prowlarr', indexerId: '12' },
      })
    )
  })

  it('returns xml error on bad apikey', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=caps&apikey=wrong'), {
      apiKey: '0123456789abcdef',
      searchService: { search: async () => [] },
    })
    expect(res.status).toBe(401)
    const text = await res.text()
    expect(text).toContain('Unauthorized')
    expect(res.headers.get('Content-Type')).toContain('xml')
  })

  it('returns caps xml for t=caps', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=caps&apikey=0123456789abcdef'), {
      apiKey: '0123456789abcdef',
      searchService: { search: async () => [] },
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('<caps')
    expect(text).toContain('movie-search')
  })

  it('returns rss items for tvsearch', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=0123456789abcdef'), {
      apiKey: '0123456789abcdef',
      searchService: {
        search: async () => [
          {
            guid: 'g1',
            title: '\u5e86\u4f59\u5e74 S02E12',
            originalTitle: '\u5e86\u4f59\u5e74 S02E12',
            downloadUrl: 'https://dl.example/1',
            categories: [5000],
            seeders: 1,
            peers: 1,
          },
        ],
      },
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('<rss')
    expect(text).toContain('\u5e86\u4f59\u5e74')
  })

  it('falls back to movie category 2000 when upstream omits categories', async () => {
    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=movie&tmdbid=1&apikey=0123456789abcdef'), {
      apiKey: '0123456789abcdef',
      searchService: {
        search: async () => [
          {
            guid: 'm1',
            title: 'Movie Title',
            originalTitle: 'Movie Title',
            downloadUrl: 'https://dl.example/m1',
            categories: [],
            seeders: 1,
            peers: 1,
          },
        ],
      },
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('>2000<')
  })

  it('returns Torznab XML when runtime deps fail to load', async () => {
    const res = await serveTorznabRequest(new Request('http://localhost/api/torznab/api?t=caps&apikey=x'), async () => {
      throw new Error('config decrypt failed')
    })
    expect(res.status).toBe(500)
    expect(res.headers.get('Content-Type')).toContain('xml')
    expect(await res.text()).toContain('Internal error')
  })
})
