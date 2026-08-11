import { runDebugSearch } from '../../../services/search/debug-search'

describe('runDebugSearch', () => {
  it('returns titles queries and deduped counts', async () => {
    const runtime = {
      env: {
        SEARCH_RESULT_LIMIT: 100,
        MAX_QUERY_FORMATS_PER_TITLE: 2,
        MAX_PROWLARR_QUERIES: 6,
      },
      resolveForRequest: async () => ({
        titles: ['\u5e86\u4f59\u5e74', 'Joy of Life'],
        sources: ['gist'],
        media: {
          mediaId: 'tvdb:366625',
          mediaType: 'series' as const,
          primaryTitle: 'Joy of Life',
          originalLanguage: 'zh',
          aliases: [
            {
              title: '\u5e86\u4f59\u5e74',
              type: 'original' as const,
              priority: 100,
              verified: true,
            },
          ],
          updatedAt: new Date().toISOString(),
          sources: ['gist'],
        },
      }),
      prowlarr: { ping: jest.fn(async () => true) },
      indexers: {
        search: jest.fn(async (q: string) => [
          {
            guid: q,
            title: `\u5e86\u4f59\u5e74 ${q}`,
            originalTitle: q,
            downloadUrl: `https://x/${q}`,
            categories: [5000],
            infoHash: 'SAME',
          },
        ]),
      },
    }

    const out = await runDebugSearch(runtime as never, {
      tvdbId: 366625,
      season: 2,
      episode: 12,
    })

    expect(out.titles).toEqual(['\u5e86\u4f59\u5e74', 'Joy of Life'])
    expect(out.queries.length).toBeGreaterThan(0)
    expect(out.resultCount).toBeGreaterThan(1)
    expect(out.deduplicatedCount).toBe(1)
    expect(out.prowlarrReachable).toBe(true)
    expect(out.media.aliases).toContain('\u5e86\u4f59\u5e74')
  })
})
