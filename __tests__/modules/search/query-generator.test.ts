import { describe, expect, it } from 'vitest'
import { generateQueries } from '../../../services/search/query-generator'

describe('generateQueries', () => {
  it('prefers SxxExx and 第x集 within limits', () => {
    const queries = generateQueries({
      titles: ['庆余年', 'Joy of Life', '慶餘年'],
      season: 2,
      episode: 12,
      maxFormatsPerTitle: 2,
      maxQueries: 6,
    })
    expect(queries.length).toBeLessThanOrEqual(6)
    expect(queries).toContain('庆余年 S02E12')
    expect(queries.some((q) => q.includes('第12集'))).toBe(true)
    expect(queries).toContain('Joy of Life S02E12')
  })

  it('uses bare title when no season/episode', () => {
    expect(
      generateQueries({
        titles: ['庆余年'],
        maxFormatsPerTitle: 2,
        maxQueries: 6,
      })
    ).toEqual(['庆余年'])
  })
})
