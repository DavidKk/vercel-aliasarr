import type { SearchResult } from './types'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
}

/** Keep releases whose title contains at least one search title (len >= 4). */
export function filterRelevantResults(results: SearchResult[], titles: string[]): SearchResult[] {
  const needles = titles.map(normalize).filter((t) => t.length >= 2)
  if (needles.length === 0) return results

  return results.filter((r) => {
    const hay = normalize(r.title)
    return needles.some((n) => hay.includes(n))
  })
}
