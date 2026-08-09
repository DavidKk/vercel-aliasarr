import { logger } from '@/utils/logger'
import type { SearchResult } from '@/services/search/types'
import { mapProwlarrRelease, type MapOptions } from './mapper'
import type { ProwlarrRelease } from './types'

export interface ProwlarrClientConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
  mapOptions?: MapOptions
}

export interface ProwlarrClient {
  search(query: string, signal?: AbortSignal): Promise<SearchResult[]>
  ping(): Promise<boolean>
}

export function createProwlarrClient(config: ProwlarrClientConfig): ProwlarrClient {
  const base = config.baseUrl.replace(/\/$/, '')

  async function search(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
    const url = new URL(`${base}/api/v1/search`)
    url.searchParams.set('query', query)
    url.searchParams.set('type', 'search')

    const timeout = AbortSignal.timeout(config.timeoutMs)
    const combined = signal != null ? AbortSignal.any([signal, timeout]) : timeout

    try {
      const res = await fetch(url, {
        headers: { 'X-Api-Key': config.apiKey },
        signal: combined,
      })
      if (!res.ok) {
        logger.warn({ status: res.status, host: url.host, path: url.pathname }, 'prowlarr search failed')
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

  return { search, ping }
}
