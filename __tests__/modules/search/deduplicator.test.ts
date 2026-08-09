import { describe, expect, it } from 'vitest'
import { deduplicateResults } from '../../../services/search/deduplicator'
import type { SearchResult } from '../../../services/search/types'

const base = (over: Partial<SearchResult>): SearchResult => ({
  guid: 'g',
  title: 't',
  originalTitle: 't',
  downloadUrl: 'https://x/1',
  categories: [5000],
  ...over,
})

describe('deduplicateResults', () => {
  it('dedupes by infoHash first', () => {
    const out = deduplicateResults([base({ guid: '1', infoHash: 'AAA', downloadUrl: 'https://a' }), base({ guid: '2', infoHash: 'AAA', downloadUrl: 'https://b' })])
    expect(out).toHaveLength(1)
  })
})
