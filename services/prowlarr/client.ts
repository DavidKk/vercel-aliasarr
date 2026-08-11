import type { SearchResult } from '@/services/search/types'
import { logger } from '@/utils/logger'

import { type MapOptions, mapProwlarrRelease } from './mapper'
import type { ProwlarrRelease } from './types'

export interface ProwlarrClientConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
  mapOptions?: MapOptions
}

export interface ProwlarrSearchOptions {
  categories?: number[]
  indexerIds?: number[]
  signal?: AbortSignal
}

export interface ProwlarrClient {
  search(query: string, options?: ProwlarrSearchOptions): Promise<SearchResult[]>
  ping(): Promise<boolean>
  listIndexers(): Promise<ProwlarrIndexer[]>
}

export interface ProwlarrIndexer {
  id: number
  name: string
  enable: boolean
  protocol?: string
  privacy?: string
  /** Prowlarr indexer language tag, e.g. `en-US`, `zh-CN`. */
  language?: string
}

export function createProwlarrClient(config: ProwlarrClientConfig): ProwlarrClient {
  const base = config.baseUrl.replace(/\/$/, '')

  async function search(query: string, options: ProwlarrSearchOptions = {}): Promise<SearchResult[]> {
    const url = new URL(`${base}/api/v1/search`)
    url.searchParams.set('query', query)
    url.searchParams.set('type', 'search')
    for (const category of options.categories ?? []) {
      url.searchParams.append('categories', String(category))
    }
    for (const indexerId of options.indexerIds ?? []) {
      url.searchParams.append('indexerIds', String(indexerId))
    }

    const timeout = AbortSignal.timeout(config.timeoutMs)
    const combined = options.signal != null ? AbortSignal.any([options.signal, timeout]) : timeout

    try {
      const res = await fetch(url, {
        headers: { 'X-Api-Key': config.apiKey },
        signal: combined,
      })
      if (!res.ok) {
        logger.warn(
          {
            status: res.status,
            host: url.host,
            path: url.pathname,
            categories: options.categories,
            indexerIds: options.indexerIds,
          },
          'prowlarr search failed'
        )
        return []
      }
      const data = (await res.json()) as ProwlarrRelease[]
      if (!Array.isArray(data)) return []
      return data.map((r) => mapProwlarrRelease(r, config.mapOptions))
    } catch (err) {
      logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          host: url.host,
          path: url.pathname,
        },
        'prowlarr search error'
      )
      return []
    }
  }

  async function ping(): Promise<boolean> {
    try {
      const res = await fetch(`${base}/api/v1/system/status`, {
        headers: { 'X-Api-Key': config.apiKey },
        signal: AbortSignal.timeout(Math.min(config.timeoutMs, 3000)),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function listIndexers(): Promise<ProwlarrIndexer[]> {
    const url = `${base}/api/v1/indexer`
    const res = await fetch(url, {
      headers: { 'X-Api-Key': config.apiKey },
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 10000)),
    })
    if (!res.ok) throw new Error(`Prowlarr indexer discovery failed (${res.status})`)
    const data = (await res.json()) as Array<Partial<ProwlarrIndexer> & { Language?: string }>
    if (!Array.isArray(data)) return []
    return data
      .filter((indexer) => Number.isInteger(indexer.id) && typeof indexer.name === 'string')
      .map((indexer) => ({
        id: indexer.id as number,
        name: indexer.name as string,
        enable: indexer.enable !== false,
        protocol: indexer.protocol,
        privacy: indexer.privacy,
        language: typeof indexer.language === 'string' ? indexer.language : typeof indexer.Language === 'string' ? indexer.Language : undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  return { search, ping, listIndexers }
}
