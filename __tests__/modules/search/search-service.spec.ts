import { createSearchService } from '../../../services/search/search-service'

describe('createSearchService', () => {
  it('runs queries with concurrency limit and merges', async () => {
    const search = jest.fn().mockImplementation(async (q: string) => [
      {
        guid: q,
        title: `Release ${q}`,
        originalTitle: q,
        downloadUrl: `https://dl/${encodeURIComponent(q)}`,
        categories: [5000],
        infoHash: q,
      },
    ])
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({
        titles: ['\u5e86\u4f59\u5e74', 'Joy of Life'],
      }),
      generateQueries: () => ['\u5e86\u4f59\u5e74 S02E12', 'Joy of Life S02E12'],
      indexers: { search },
      maxConcurrency: 1,
      resultLimit: 100,
      cache: { get: async () => null, set: async () => undefined, delete: async () => undefined },
    })
    const results = await service.search({
      type: 'tvsearch',
      season: 2,
      ep: 12,
      tvdbId: 366625,
      categories: [5000],
      limit: 100,
      offset: 0,
    })
    expect(search).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(2)
  })

  it('browses requested categories when the indexer test has no title', async () => {
    const search = jest.fn().mockResolvedValue([
      {
        guid: 'recent-tv',
        title: 'Recent TV Release S01E01',
        originalTitle: 'Recent TV Release S01E01',
        downloadUrl: 'https://dl/recent-tv',
        categories: [5040],
      },
    ])
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({ titles: [] }),
      generateQueries: () => [],
      indexers: { search },
      maxConcurrency: 1,
      resultLimit: 100,
      cache: { get: async () => null, set: async () => undefined, delete: async () => undefined },
    })

    const results = await service.search({
      type: 'tvsearch',
      categories: [5030, 5040],
      limit: 100,
      offset: 0,
    })

    expect(search).toHaveBeenCalledWith('', { categories: [5030, 5040], mediaType: 'series' })
    expect(results).toHaveLength(1)
    expect(results[0]?.categories).toContain(5040)
  })

  it('passes movie context to the unified indexer client', async () => {
    const search = jest.fn().mockResolvedValue([])
    const service = createSearchService({
      resolveTitlesForRequest: async () => ({ titles: ['Movie'] }),
      generateQueries: () => ['Movie 2026'],
      indexers: { search },
      maxConcurrency: 1,
      resultLimit: 100,
      cache: { get: async () => null, set: async () => undefined, delete: async () => undefined },
    })

    await service.search({
      type: 'movie',
      q: 'Movie',
      year: 2026,
      categories: [2000],
      limit: 100,
      offset: 0,
    })

    expect(search).toHaveBeenCalledWith('Movie 2026', { categories: [2000], mediaType: 'movie' })
  })
})
