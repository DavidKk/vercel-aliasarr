import { createMemoryCache } from '../../../services/cache/memory-cache'
import { createSearchService } from '../../../services/search/search-service'

describe('search service cache TTL', () => {
  it('returns cached hits within hit TTL and re-queries after expiry', async () => {
    let now = 1_000_000
    const cache = createMemoryCache({ now: () => now })
    const search = jest.fn(async () => [{ guid: '1', title: 'A', originalTitle: 'A', downloadUrl: 'https://x', categories: [5000] }])
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({ titles: ['\u5e86\u4f59\u5e74'] }),
      generateQueries: () => ['\u5e86\u4f59\u5e74'],
      indexers: { search },
      maxConcurrency: 1,
      resultLimit: 10,
      cache,
      hitTtlMs: 1_000,
      emptyTtlMs: 500,
    })

    const req = { type: 'tvsearch' as const, categories: [5000], limit: 10, offset: 0, q: '\u5e86\u4f59\u5e74' }
    await service.search(req)
    await service.search(req)
    expect(search).toHaveBeenCalledTimes(1)

    now += 1_100
    await service.search(req)
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('uses shorter TTL for empty results', async () => {
    let now = 1_000_000
    const cache = createMemoryCache({ now: () => now })
    const search = jest.fn(async () => [])
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({ titles: ['missing'] }),
      generateQueries: () => ['missing'],
      indexers: { search },
      maxConcurrency: 1,
      resultLimit: 10,
      cache,
      hitTtlMs: 60_000,
      emptyTtlMs: 1_000,
    })

    const req = { type: 'tvsearch' as const, categories: [5000], limit: 10, offset: 0, q: 'missing' }
    await service.search(req)
    await service.search(req)
    expect(search).toHaveBeenCalledTimes(1)

    now += 1_100
    await service.search(req)
    expect(search).toHaveBeenCalledTimes(2)
  })
})
