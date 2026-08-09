import { TorznabError } from './errors'
import type { TorznabRequest, TorznabType } from './types'

const SUPPORTED: TorznabType[] = ['caps', 'search', 'tvsearch']

function parseOptionalInt(value: string | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new TorznabError(200, `Invalid integer: ${value}`)
  }
  return Math.trunc(n)
}

export function parseTorznabQuery(searchParams: URLSearchParams): TorznabRequest {
  const t = (searchParams.get('t') ?? 'search') as TorznabType
  if (!SUPPORTED.includes(t)) {
    throw new TorznabError(201, `Unsupported function: ${t}`)
  }

  const catRaw = searchParams.get('cat')
  const categories = catRaw
    ? catRaw
        .split(',')
        .map((c) => Number(c.trim()))
        .filter((n) => Number.isFinite(n))
    : []

  return {
    type: t,
    q: searchParams.get('q') ?? undefined,
    season: parseOptionalInt(searchParams.get('season')),
    ep: parseOptionalInt(searchParams.get('ep')),
    tvdbId: parseOptionalInt(searchParams.get('tvdbid')),
    tmdbId: parseOptionalInt(searchParams.get('tmdbid')),
    imdbId: searchParams.get('imdbid') ?? undefined,
    categories,
    limit: parseOptionalInt(searchParams.get('limit')) ?? 100,
    offset: parseOptionalInt(searchParams.get('offset')) ?? 0,
    apikey: searchParams.get('apikey') ?? undefined,
  }
}
