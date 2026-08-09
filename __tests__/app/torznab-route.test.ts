import { describe, expect, it, vi } from 'vitest'
import { handleTorznabRequest } from '../../services/torznab/handler'

describe('handleTorznabRequest', () => {
  it('returns xml error on bad apikey', async () => {
    vi.stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    vi.stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    vi.stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=caps&apikey=wrong'), {
      searchService: { tvSearch: async () => [] },
    })
    expect(res.status).toBe(401)
    const text = await res.text()
    expect(text).toContain('Unauthorized')
    expect(res.headers.get('Content-Type')).toContain('xml')
  })

  it('returns caps xml for t=caps', async () => {
    vi.stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    vi.stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    vi.stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=caps&apikey=0123456789abcdef'), { searchService: { tvSearch: async () => [] } })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('<caps')
  })

  it('returns rss items for tvsearch', async () => {
    vi.stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    vi.stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    vi.stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const res = await handleTorznabRequest(new URL('http://localhost/api/torznab?t=tvsearch&tvdbid=366625&season=2&ep=12&apikey=0123456789abcdef'), {
      searchService: {
        tvSearch: async () => [
          {
            guid: 'g1',
            title: '庆余年 S02E12',
            originalTitle: '庆余年 S02E12',
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
    expect(text).toContain('庆余年')
  })
})
