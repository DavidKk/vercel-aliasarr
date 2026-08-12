import type { GenerateQueriesInput } from './types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function generateQueries(input: GenerateQueriesInput): string[] {
  const { titles, season, episode, year, mediaType = 'series', maxFormatsPerTitle, maxQueries } = input
  const out: string[] = []
  const seen = new Set<string>()

  const push = (q: string) => {
    if (seen.has(q)) return
    seen.add(q)
    out.push(q)
  }

  for (const title of titles) {
    const formats: string[] = []

    if (mediaType === 'movie') {
      formats.push(title)
      if (year != null) {
        formats.push(`${title} ${year}`)
      }
    } else if (season != null && episode != null) {
      formats.push(`${title} S${pad(season)}E${pad(episode)}`)
      formats.push(`${title} \u7b2c${episode}\u96c6`)
    } else if (season != null) {
      formats.push(`${title} S${pad(season)}`)
    } else if (episode != null) {
      formats.push(`${title} \u7b2c${episode}\u96c6`)
    } else {
      formats.push(title)
    }

    for (const f of formats.slice(0, maxFormatsPerTitle)) {
      push(f)
      if (out.length >= maxQueries) return out
    }
  }

  return out.slice(0, maxQueries)
}
