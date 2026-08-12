import { randomUUID } from 'node:crypto'

import { getAppRuntime } from '@/services/app/runtime'
import type { SearchResult } from '@/services/search/types'
import { assertTorznabApiKey, UnauthorizedError } from '@/services/security/api-key'
import { buildCapsXml } from '@/services/torznab/caps'
import { TorznabError } from '@/services/torznab/errors'
import { parseTorznabQuery } from '@/services/torznab/parser'
import type { TorznabItem } from '@/services/torznab/types'
import { buildErrorXml, buildRssXml } from '@/services/torznab/xml-builder'
import { childLogger } from '@/utils/logger'

const XML_HEADERS = {
  'Content-Type': 'application/rss+xml; charset=utf-8',
}

export interface TorznabDeps {
  apiKey?: string
  searchService: {
    search: (req: ReturnType<typeof parseTorznabQuery>) => Promise<SearchResult[]>
    tvSearch?: (req: ReturnType<typeof parseTorznabQuery>) => Promise<SearchResult[]>
  }
}

export async function getDefaultTorznabDeps(): Promise<TorznabDeps> {
  const app = await getAppRuntime()
  return { apiKey: app.secrets.torznabApiKey, searchService: app.searchService }
}

function toItems(results: SearchResult[], fallbackCategories: number[]): TorznabItem[] {
  return results.map((r) => ({
    title: r.title,
    guid: r.guid,
    link: r.downloadUrl,
    infoUrl: r.infoUrl,
    indexerId: r.indexerId,
    indexerName: r.indexerName,
    pubDate: r.publishDate ? new Date(r.publishDate) : new Date(),
    size: r.size,
    categories: r.categories.length ? r.categories : fallbackCategories,
    seeders: r.seeders,
    leechers: r.leechers,
    peers: r.peers,
    infoHash: r.infoHash,
  }))
}

function defaultCategoriesForRequest(req: ReturnType<typeof parseTorznabQuery>): number[] {
  if (req.categories.length) return req.categories
  return req.type === 'movie' ? [2000] : [5000]
}

export async function handleTorznabRequest(url: URL, deps: TorznabDeps): Promise<Response> {
  const requestId = randomUUID()
  const log = childLogger({ requestId })

  try {
    const req = parseTorznabQuery(url.searchParams)
    assertTorznabApiKey(req.apikey, deps.apiKey)

    if (req.type === 'caps') {
      return new Response(buildCapsXml(), {
        status: 200,
        headers: XML_HEADERS,
      })
    }

    log.info(
      {
        type: req.type,
        tvdbId: req.tvdbId,
        tmdbId: req.tmdbId,
        season: req.season,
        ep: req.ep,
        year: req.year,
      },
      'torznab search'
    )

    const results = await deps.searchService.search(req)
    const xml = buildRssXml(toItems(results, defaultCategoriesForRequest(req)), {
      offset: req.offset,
      total: results.length,
    })
    log.info({ resultCount: results.length }, 'torznab search done')
    return new Response(xml, { status: 200, headers: XML_HEADERS })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(buildErrorXml(100, 'Unauthorized'), {
        status: 401,
        headers: XML_HEADERS,
      })
    }
    if (err instanceof TorznabError) {
      return new Response(buildErrorXml(err.code, err.message), {
        status: 400,
        headers: XML_HEADERS,
      })
    }
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'torznab handler error')
    return new Response(buildErrorXml(900, 'Internal error'), {
      status: 500,
      headers: XML_HEADERS,
    })
  }
}

/** Load runtime deps and always return Torznab XML (never Next HTML error pages). */
export async function serveTorznabRequest(request: Request, loadDeps: () => Promise<TorznabDeps> = getDefaultTorznabDeps): Promise<Response> {
  try {
    const deps = await loadDeps()
    return handleTorznabRequest(new URL(request.url), deps)
  } catch (err) {
    childLogger({ requestId: randomUUID() }).error({ err: err instanceof Error ? err.message : String(err) }, 'torznab deps error')
    return new Response(buildErrorXml(900, 'Internal error'), {
      status: 500,
      headers: XML_HEADERS,
    })
  }
}
