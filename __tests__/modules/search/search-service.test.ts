import { describe, expect, it, vi } from 'vitest'
import { createSearchService } from '../../../services/search/search-service'

describe('createSearchService', () => {
  it('runs queries with concurrency limit and merges', async () => {
    const search = vi.fn().mockImplementation(async (q: string) => [
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
        titles: ['庆余年', 'Joy of Life'],
      }),
      generateQueries: () => ['庆余年 S02E12', 'Joy of Life S02E12'],
      prowlarr: { search },
      maxConcurrency: 1,
      resultLimit: 100,
      cache: { get: async () => null, set: async () => undefined },
    })
    const results = await service.tvSearch({
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
})
