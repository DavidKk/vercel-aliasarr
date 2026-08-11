import { cloudflareAccessFailureMessage, looksLikeCloudflareAccess } from '@/services/http/cloudflare-access'
import type { SearchResult } from '@/services/search/types'
import { logger } from '@/utils/logger'

import { type MapOptions, mapProwlarrRelease } from './mapper'
import type { ProwlarrRelease } from './types'

export interface ProwlarrClientConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
  mapOptions?: MapOptions
  /** Extra request headers (Cloudflare Access, reverse-proxy auth, …). */
  headers?: Record<string, string>
}

export interface ProwlarrSearchOptions {
  categories?: number[]
  indexerIds?: number[]
  signal?: AbortSignal
}

export interface ProwlarrClient {
  search(query: string, options?: ProwlarrSearchOptions): Promise<SearchResult[]>
  ping(): Promise<boolean>
  /** Throws a detailed error when Cloudflare Access or auth fails. */
  probe?(): Promise<void>
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
  const customHeaderNames = Object.keys(config.headers ?? {})
  const requestHeaders = { ...(config.headers ?? {}), 'X-Api-Key': config.apiKey }

  async function upstream(url: string | URL, init: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: { ...requestHeaders, ...init.headers },
      redirect: 'manual',
      signal: init.signal,
    })
  }

  function assertReachable(response: Response, body = ''): void {
    if (looksLikeCloudflareAccess(response.status, response, body)) {
      throw new Error(cloudflareAccessFailureMessage('Prowlarr', response.status, customHeaderNames))
    }
    if (response.status >= 300 && response.status < 400) {
      throw new Error(`Prowlarr redirected (HTTP ${response.status})`)
    }
    if (!response.ok) {
      throw new Error(`Prowlarr returned HTTP ${response.status}`)
    }
  }

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
      const res = await upstream(url, { signal: combined })
      if (!res.ok || (res.status >= 300 && res.status < 400)) {
        const body = res.status === 401 || res.status === 403 ? await res.text().catch(() => '') : ''
        const accessBlocked = looksLikeCloudflareAccess(res.status, res, body)
        logger.warn(
          {
            status: res.status,
            host: url.host,
            path: url.pathname,
            categories: options.categories,
            indexerIds: options.indexerIds,
            accessBlocked,
            detail: accessBlocked ? cloudflareAccessFailureMessage('Prowlarr', res.status, customHeaderNames) : undefined,
          },
          accessBlocked ? 'prowlarr search blocked by Cloudflare Access' : 'prowlarr search failed'
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

  async function probe(): Promise<void> {
    const res = await upstream(`${base}/api/v1/system/status`, {
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 3000)),
    })
    const body = res.ok ? '' : await res.text()
    assertReachable(res, body)
  }

  async function ping(): Promise<boolean> {
    try {
      await probe()
      return true
    } catch {
      return false
    }
  }

  async function listIndexers(): Promise<ProwlarrIndexer[]> {
    const url = `${base}/api/v1/indexer`
    const res = await upstream(url, {
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 10000)),
    })
    if (!res.ok || (res.status >= 300 && res.status < 400)) {
      const body = await res.text().catch(() => '')
      if (looksLikeCloudflareAccess(res.status, res, body)) {
        throw new Error(cloudflareAccessFailureMessage('Prowlarr', res.status, customHeaderNames))
      }
      if (res.status >= 300 && res.status < 400) {
        throw new Error(`Prowlarr redirected (HTTP ${res.status})`)
      }
      throw new Error(`Prowlarr indexer discovery failed (${res.status})`)
    }
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

  return { search, ping, probe, listIndexers }
}
