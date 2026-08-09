import { describe, expect, it } from 'vitest'
import { filterRelevantResults } from '../../../services/search/relevance'

describe('filterRelevantResults', () => {
  it('keeps titles matching chinese or english alias', () => {
    const out = filterRelevantResults(
      [
        {
          guid: '1',
          title: "[FSP DN] A Record of a Mortal's Journey to Immortality - 176",
          originalTitle: 'x',
          downloadUrl: 'https://a',
          categories: [5000],
        },
        {
          guid: '2',
          title: 'Random Unrelated Movie 2024',
          originalTitle: 'y',
          downloadUrl: 'https://b',
          categories: [5000],
        },
        {
          guid: '3',
          title: '凡人修仙传 第170集 1080p',
          originalTitle: 'z',
          downloadUrl: 'https://c',
          categories: [5000],
        },
      ],
      ['凡人修仙传', "A Record of a Mortal's Journey to Immortality"]
    )
    expect(out.map((r) => r.guid)).toEqual(['1', '3'])
  })
})
