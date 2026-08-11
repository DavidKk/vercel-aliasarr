import { generateQueries } from '../../../services/search/query-generator'

describe('generateQueries', () => {
  it('prefers SxxExx and Chinese episode format within limits', () => {
    const queries = generateQueries({
      titles: ['\u5e86\u4f59\u5e74', 'Joy of Life', '\u6176\u9918\u5e74'],
      season: 2,
      episode: 12,
      maxFormatsPerTitle: 2,
      maxQueries: 6,
    })
    expect(queries.length).toBeLessThanOrEqual(6)
    expect(queries).toContain('\u5e86\u4f59\u5e74 S02E12')
    expect(queries.some((q) => q.includes('\u7b2c12\u96c6'))).toBe(true)
    expect(queries).toContain('Joy of Life S02E12')
  })

  it('uses bare title when no season/episode', () => {
    expect(
      generateQueries({
        titles: ['\u5e86\u4f59\u5e74'],
        maxFormatsPerTitle: 2,
        maxQueries: 6,
      })
    ).toEqual(['\u5e86\u4f59\u5e74'])
  })

  it('builds movie queries with year', () => {
    const queries = generateQueries({
      titles: ['\u54ea\u5412', 'Ne Zha'],
      mediaType: 'movie',
      year: 2025,
      maxFormatsPerTitle: 2,
      maxQueries: 6,
    })
    expect(queries).toContain('\u54ea\u5412')
    expect(queries).toContain('\u54ea\u5412 2025')
  })
})
