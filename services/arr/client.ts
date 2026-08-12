import { cloudflareAccessFailureMessage, looksLikeCloudflareAccess } from '@/services/http/cloudflare-access'
import type { TorznabIndexerProvider } from '@/services/torznab/types'

export type ArrApplication = 'sonarr' | 'radarr'

interface ProviderField {
  name?: string
  value?: unknown
  [key: string]: unknown
}

interface IndexerResource {
  id?: number
  name?: string
  implementation?: string
  configContract?: string
  fields?: ProviderField[]
  [key: string]: unknown
}

export interface ArrClientConfig {
  application: ArrApplication
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  testTimeoutMs?: number
  /** Extra request headers (Cloudflare Access, reverse-proxy auth, …). */
  headers?: Record<string, string>
}

export interface AliasarrIndexerTarget {
  name: string
  baseUrl: string
  apiKey: string
}

export interface ArrIndexerStatus {
  reachable: boolean
  installed: boolean
  installedCount: number
  id?: number
}

export interface ArrSyncResult {
  created: number
  updated: number
  removed: number
  forced: number
  installedCount: number
}

export interface ArrClient {
  ping(): Promise<void>
  status(): Promise<ArrIndexerStatus>
  sync(targets: AliasarrIndexerTarget[], options?: ArrSyncOptions): Promise<ArrSyncResult>
  remove(): Promise<{ removed: number }>
}

export interface ArrSyncOptions {
  /** Providers whose listing failed — keep their managed indexers instead of pruning. */
  retainProviders?: TorznabIndexerProvider[]
}

export const ALIASARR_INDEXER_SUFFIX = ' (Aliasarr)'
export const LEGACY_ALIASARR_INDEXER_NAME = 'Aliasarr'
const MANAGED_NAME_RE = /\(Aliasarr(?: · (?:Prowlarr|Jackett))?\)$/
const UPSERT_CONCURRENCY = 4

const providerLabel: Record<TorznabIndexerProvider, string> = {
  prowlarr: 'Prowlarr',
  jackett: 'Jackett',
}

export function aliasarrManagedIndexerName(indexerName: string, provider: TorznabIndexerProvider): string {
  return `${indexerName.trim()} (Aliasarr · ${providerLabel[provider]})`
}

export function providerFromManagedIndexerName(name: string): TorznabIndexerProvider | null {
  if (/\(Aliasarr · Prowlarr\)$/.test(name)) return 'prowlarr'
  if (/\(Aliasarr · Jackett\)$/.test(name)) return 'jackett'
  return null
}

export function isAliasarrManagedIndexer(resource: { name?: string; implementation?: string }): boolean {
  if (resource.implementation !== 'Torznab') return false
  const name = resource.name ?? ''
  return name === LEGACY_ALIASARR_INDEXER_NAME || MANAGED_NAME_RE.test(name) || name.endsWith(ALIASARR_INDEXER_SUFFIX)
}

function isFullyDisabledIndexer(resource: IndexerResource): boolean {
  return resource.enableRss !== true && resource.enableAutomaticSearch !== true && resource.enableInteractiveSearch !== true
}

function cloneResource<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function setField(resource: IndexerResource, name: string, value: unknown): void {
  const field = resource.fields?.find((candidate) => candidate.name === name)
  if (!field) throw new Error(`Torznab schema field ${name} is unavailable`)
  field.value = value
}

function extractArrValidationMessages(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return body
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) {
      const messages = parsed
        .map((item) => (item && typeof item === 'object' && 'errorMessage' in item ? String((item as { errorMessage?: unknown }).errorMessage ?? '') : ''))
        .filter(Boolean)
      if (messages.length) return messages.join('\n')
    }
  } catch {
    // keep raw body
  }
  return trimmed
}

/** True when *arr indexer test only failed because categories returned no hits (safe to forceSave). */
export function isEmptyCategoryValidation(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  // EN + zh-CN + zh-TW. Match both decoded Chinese and raw \uXXXX escapes from Sonarr JSON.
  return (
    /no results in the configured categories/i.test(error.message) ||
    /未返回配置分类中的结果|未傳回設定分類中的結果/.test(error.message) ||
    /\\u672a\\u8fd4\\u56de\\u914d\\u7f6e\\u5206\\u7c7b\\u4e2d\\u7684\\u7ed3\\u679c/i.test(error.message)
  )
}

function upstreamFailureMessage(application: ArrApplication, status: number, response: Response, body: string, sentHeaderNames: string[]): string {
  if (looksLikeCloudflareAccess(status, response, body)) {
    return cloudflareAccessFailureMessage(application, status, sentHeaderNames)
  }
  const detail = extractArrValidationMessages(body)
  return `${application} API ${status}: ${detail.slice(0, 300)}`
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return []
  const results = new Array<R>(items.length)
  let next = 0
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index]!, index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

export function createArrClient(config: ArrClientConfig): ArrClient {
  const base = config.baseUrl.replace(/\/$/, '')
  const timeoutMs = config.timeoutMs ?? 15000
  const customHeaderNames = Object.keys(config.headers ?? {})
  const baseHeaders = {
    ...(config.headers ?? {}),
    'X-Api-Key': config.apiKey,
  }

  async function rawFetch(path: string, init: RequestInit = {}, requestTimeoutMs = timeoutMs): Promise<Response> {
    const method = (init.method ?? 'GET').toUpperCase()
    return fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(method !== 'GET' && method !== 'HEAD' ? { 'Content-Type': 'application/json' } : {}),
        ...baseHeaders,
        ...init.headers,
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
  }

  async function request<T>(path: string, init: RequestInit = {}, requestTimeoutMs = timeoutMs): Promise<T> {
    const response = await rawFetch(path, init, requestTimeoutMs)
    if (response.status >= 300 && response.status < 400) {
      throw new Error(upstreamFailureMessage(config.application, response.status, response, '', customHeaderNames))
    }
    if (!response.ok) {
      const message = await response.text()
      throw new Error(upstreamFailureMessage(config.application, response.status, response, message, customHeaderNames))
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  async function ping(): Promise<void> {
    const response = await rawFetch('/api/v3/system/status', { method: 'GET' }, Math.min(timeoutMs, 10000))
    if (response.status >= 300 && response.status < 400) {
      throw new Error(upstreamFailureMessage(config.application, response.status, response, '', customHeaderNames))
    }
    if (!response.ok) {
      const message = await response.text()
      throw new Error(upstreamFailureMessage(config.application, response.status, response, message, customHeaderNames))
    }
  }

  async function list(): Promise<IndexerResource[]> {
    const resources = await request<IndexerResource[]>('/api/v3/indexer')
    return Array.isArray(resources) ? resources : []
  }

  async function status(): Promise<ArrIndexerStatus> {
    try {
      const managed = (await list()).filter(isAliasarrManagedIndexer)
      return {
        reachable: true,
        installed: managed.length > 0,
        installedCount: managed.length,
        id: managed[0]?.id,
      }
    } catch {
      return { reachable: false, installed: false, installedCount: 0 }
    }
  }

  async function buildResource(target: AliasarrIndexerTarget, existing?: IndexerResource): Promise<IndexerResource> {
    if (existing) {
      // Updates only refresh connection fields; keep tags/categories/priority/search toggles from *arr.
      const resource = cloneResource(existing)
      resource.name = target.name
      setField(resource, 'baseUrl', target.baseUrl.replace(/\/$/, ''))
      setField(resource, 'apiPath', '/api')
      setField(resource, 'apiKey', target.apiKey)
      // Recover drafts left disabled when a previous enable step failed.
      if (isFullyDisabledIndexer(resource)) {
        resource.enableRss = true
        resource.enableAutomaticSearch = true
        resource.enableInteractiveSearch = true
      }
      return resource
    }

    const schemas = await request<IndexerResource[]>('/api/v3/indexer/schema')
    const torznab = schemas.find((schema) => schema.implementation === 'Torznab')
    if (!torznab) throw new Error(`${config.application} does not expose a Torznab schema`)
    const resource = cloneResource(torznab)
    resource.name = target.name
    resource.enableRss = true
    resource.enableAutomaticSearch = true
    resource.enableInteractiveSearch = true
    resource.priority = 25
    resource.tags = []
    setField(resource, 'baseUrl', target.baseUrl.replace(/\/$/, ''))
    setField(resource, 'apiPath', '/api')
    setField(resource, 'apiKey', target.apiKey)
    setField(resource, 'categories', config.application === 'sonarr' ? [5000, 5030, 5040, 5045] : [2000, 2030, 2040, 2045])
    if (config.application === 'sonarr') {
      const anime = resource.fields?.find((field) => field.name === 'animeCategories')
      if (anime) anime.value = []
    }
    return resource
  }

  async function upsertOne(target: AliasarrIndexerTarget, existing: IndexerResource | undefined): Promise<{ created: boolean; forced: boolean }> {
    if (existing?.id != null) {
      const resource = await buildResource(target, existing)
      // Updates skip live Test when forceSave=true (empty-category is still a hard error on create).
      await request<IndexerResource>(`/api/v3/indexer/${existing.id}?forceSave=true`, {
        method: 'PUT',
        body: JSON.stringify({ ...resource, id: existing.id }),
      })
      return { created: false, forced: true }
    }

    const resource = await buildResource(target)
    // Create disabled first so Enable=false and *arr skips Test. Empty-category failures cannot be force-saved on create.
    const draft = {
      ...resource,
      enableRss: false,
      enableAutomaticSearch: false,
      enableInteractiveSearch: false,
    }
    const created = await request<IndexerResource>('/api/v3/indexer', { method: 'POST', body: JSON.stringify(draft) })
    if (created?.id == null) throw new Error(`${config.application} created indexer without an id`)

    const enabled = {
      ...created,
      ...resource,
      id: created.id,
      enableRss: true,
      enableAutomaticSearch: true,
      enableInteractiveSearch: true,
    }
    try {
      await request<IndexerResource>(`/api/v3/indexer/${created.id}?forceSave=true`, {
        method: 'PUT',
        body: JSON.stringify(enabled),
      })
    } catch (error) {
      try {
        await request(`/api/v3/indexer/${created.id}`, { method: 'DELETE' })
      } catch {
        // Best-effort rollback; surface the original enable failure.
      }
      throw error
    }
    return { created: true, forced: true }
  }

  async function sync(targets: AliasarrIndexerTarget[], options: ArrSyncOptions = {}): Promise<ArrSyncResult> {
    const retainProviders = new Set(options.retainProviders ?? [])
    const current = await list()
    const managed = current.filter(isAliasarrManagedIndexer)
    const byName = new Map(managed.map((resource) => [resource.name ?? '', resource]))
    const desiredNames = new Set(targets.map((target) => target.name))

    const upsertResults = await mapPool(targets, UPSERT_CONCURRENCY, async (target) => upsertOne(target, byName.get(target.name)))

    let created = 0
    let updated = 0
    let forced = 0
    for (const result of upsertResults) {
      if (result.created) created += 1
      else updated += 1
      if (result.forced) forced += 1
    }

    const stale = managed.filter((resource) => {
      const name = resource.name ?? ''
      if (desiredNames.has(name)) return false
      const provider = providerFromManagedIndexerName(name)
      if (provider && retainProviders.has(provider)) return false
      return true
    })
    await Promise.all(stale.filter((resource) => resource.id != null).map((resource) => request(`/api/v3/indexer/${resource.id}`, { method: 'DELETE' })))

    const installedCount = (await list()).filter(isAliasarrManagedIndexer).length
    return { created, updated, removed: stale.length, forced, installedCount }
  }

  async function remove(): Promise<{ removed: number }> {
    const matches = (await list()).filter(isAliasarrManagedIndexer).filter((resource) => resource.id != null)
    await Promise.all(matches.map((resource) => request(`/api/v3/indexer/${resource.id}`, { method: 'DELETE' })))
    return { removed: matches.length }
  }

  return { ping, status, sync, remove }
}
