import { cloudflareAccessFailureMessage, looksLikeCloudflareAccess } from '@/services/http/cloudflare-access'

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

export interface AliasarrIndexerInput {
  baseUrl: string
  apiKey: string
}

export interface ArrIndexerStatus {
  reachable: boolean
  installed: boolean
  id?: number
}

export interface ArrClient {
  ping(): Promise<void>
  status(): Promise<ArrIndexerStatus>
  sync(input: AliasarrIndexerInput): Promise<{ created: boolean; id?: number; forced: boolean }>
  remove(): Promise<{ removed: number }>
}

function cloneResource<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function setField(resource: IndexerResource, name: string, value: unknown): void {
  const field = resource.fields?.find((candidate) => candidate.name === name)
  if (!field) throw new Error(`Torznab schema field ${name} is unavailable`)
  field.value = value
}

function isAliasarr(resource: IndexerResource): boolean {
  return resource.name === 'Aliasarr' && resource.implementation === 'Torznab'
}

function isEmptyCategoryValidation(error: unknown): boolean {
  return error instanceof Error && /no results in the configured categories/i.test(error.message)
}

function upstreamFailureMessage(application: ArrApplication, status: number, response: Response, body: string, sentHeaderNames: string[]): string {
  if (looksLikeCloudflareAccess(status, response, body)) {
    return cloudflareAccessFailureMessage(application, status, sentHeaderNames)
  }
  return `${application} API ${status}: ${body.slice(0, 300)}`
}

export function createArrClient(config: ArrClientConfig): ArrClient {
  const base = config.baseUrl.replace(/\/$/, '')
  const timeoutMs = config.timeoutMs ?? 15000
  const testTimeoutMs = config.testTimeoutMs ?? 45000
  const customHeaderNames = Object.keys(config.headers ?? {})
  // Keep service API key authoritative; attach Cloudflare / proxy headers alongside it.
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
      // Do not follow Access login redirects — treat them as blocked upstream.
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
      const installed = (await list()).find(isAliasarr)
      return { reachable: true, installed: installed != null, id: installed?.id }
    } catch {
      return { reachable: false, installed: false }
    }
  }

  async function buildResource(input: AliasarrIndexerInput, existing?: IndexerResource): Promise<IndexerResource> {
    let resource = existing == null ? undefined : cloneResource(existing)
    if (!resource) {
      const schemas = await request<IndexerResource[]>('/api/v3/indexer/schema')
      const torznab = schemas.find((schema) => schema.implementation === 'Torznab')
      if (!torznab) throw new Error(`${config.application} does not expose a Torznab schema`)
      resource = cloneResource(torznab)
    }

    resource.name = 'Aliasarr'
    resource.enableRss = true
    resource.enableAutomaticSearch = true
    resource.enableInteractiveSearch = true
    resource.priority = 25
    resource.tags = []
    setField(resource, 'baseUrl', input.baseUrl.replace(/\/$/, ''))
    setField(resource, 'apiPath', '/api')
    setField(resource, 'apiKey', input.apiKey)
    setField(resource, 'categories', config.application === 'sonarr' ? [5000, 5030, 5040, 5045] : [2000, 2030, 2040, 2045])
    if (config.application === 'sonarr') {
      const anime = resource.fields?.find((field) => field.name === 'animeCategories')
      if (anime) anime.value = []
    }
    return resource
  }

  async function sync(input: AliasarrIndexerInput): Promise<{ created: boolean; id?: number; forced: boolean }> {
    const existing = (await list()).find(isAliasarr)
    const resource = await buildResource(input, existing)
    let forced = false
    try {
      await request('/api/v3/indexer/test', { method: 'POST', body: JSON.stringify(resource) }, testTimeoutMs)
    } catch (error) {
      if (!isEmptyCategoryValidation(error)) throw error
      forced = true
    }

    const forceSave = forced ? '?forceSave=true' : ''

    if (existing?.id != null) {
      const updated = await request<IndexerResource>(`/api/v3/indexer/${existing.id}${forceSave}`, {
        method: 'PUT',
        body: JSON.stringify({ ...resource, id: existing.id }),
      })
      return { created: false, id: updated.id ?? existing.id, forced }
    }

    const created = await request<IndexerResource>(`/api/v3/indexer${forceSave}`, { method: 'POST', body: JSON.stringify(resource) })
    return { created: true, id: created.id, forced }
  }

  async function remove(): Promise<{ removed: number }> {
    const matches = (await list()).filter(isAliasarr).filter((resource) => resource.id != null)
    await Promise.all(matches.map((resource) => request(`/api/v3/indexer/${resource.id}`, { method: 'DELETE' })))
    return { removed: matches.length }
  }

  return { ping, status, sync, remove }
}
