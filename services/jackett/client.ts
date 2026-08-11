import { convert } from 'xmlbuilder2'

import type { SearchResult } from '@/services/search/types'
import { logger } from '@/utils/logger'

export interface JackettClientConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
}

export interface JackettIndexer {
  id: string
  name: string
  configured: boolean
}

export interface JackettSearchOptions {
  categories?: number[]
  indexerIds?: string[]
  signal?: AbortSignal
}

export interface JackettClient {
  search(query: string, options?: JackettSearchOptions): Promise<SearchResult[]>
  ping(): Promise<boolean>
  listIndexers(): Promise<JackettIndexer[]>
}

export class JackettApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly description: string
  ) {
    super(`Jackett API error ${code}: ${description}`)
    this.name = 'JackettApiError'
  }
}

type XmlValue = string | number | boolean | null | undefined | XmlObject | XmlValue[]
interface XmlObject {
  [key: string]: XmlValue
}

function arrayify<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function objectValue(value: XmlValue): XmlObject {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function textValue(value: XmlValue): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  const object = objectValue(value)
  return textValue(object['#'] ?? object['#text'])
}

function numberValue(value: XmlValue): number | undefined {
  const parsed = Number(textValue(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseXml(xml: string): XmlObject {
  return convert(xml, { format: 'object' }) as XmlObject
}

function parseApiError(xml: string): { code: string; description: string } | null {
  const error = objectValue(parseXml(xml).error)
  if (Object.keys(error).length === 0) return null
  return {
    code: textValue(error['@code']) || 'unknown',
    description: textValue(error['@description']) || textValue(error) || 'Unknown Jackett error',
  }
}

function parseAttributes(item: XmlObject): XmlObject[] {
  return arrayify(item['torznab:attr']).map(objectValue)
}

function attributeValue(attributes: XmlObject[], name: string): string | undefined {
  const attribute = attributes.find((entry) => textValue(entry['@name']) === name)
  const value = attribute == null ? '' : textValue(attribute['@value'])
  return value || undefined
}

function parseSearchResults(xml: string, fallbackIndexerId: string): SearchResult[] {
  const document = parseXml(xml)
  const rss = objectValue(document.rss)
  const channel = objectValue(rss.channel)
  return arrayify(channel.item).map((raw) => {
    const item = objectValue(raw)
    const attributes = parseAttributes(item)
    const title = textValue(item.title) || 'unknown'
    const downloadUrl = textValue(item.link) || textValue(item.enclosure && objectValue(item.enclosure)['@url'])
    const indexer = objectValue(item.jackettindexer)
    const categoryValues = [
      ...arrayify(item.category).map(numberValue),
      ...attributes.filter((entry) => textValue(entry['@name']) === 'category').map((entry) => numberValue(entry['@value'])),
    ].filter((value): value is number => value != null)
    const seeders = numberValue(attributeValue(attributes, 'seeders'))
    const peers = numberValue(attributeValue(attributes, 'peers'))
    const size = numberValue(item.size) ?? numberValue(objectValue(item.enclosure)['@length'])

    return {
      guid: textValue(item.guid) || downloadUrl || `${fallbackIndexerId}:${title}`,
      title,
      originalTitle: title,
      indexerId: textValue(indexer['@id']) || fallbackIndexerId,
      indexerName: textValue(indexer) || fallbackIndexerId,
      infoUrl: textValue(item.comments) || undefined,
      downloadUrl,
      infoHash: attributeValue(attributes, 'infohash'),
      size,
      seeders,
      peers,
      leechers: peers != null && seeders != null ? Math.max(peers - seeders, 0) : undefined,
      publishDate: textValue(item.pubDate) || undefined,
      categories: [...new Set(categoryValues)],
      protocol: 'torrent' as const,
    }
  })
}

function parseIndexerList(xml: string): JackettIndexer[] {
  const document = parseXml(xml)
  const root = objectValue(document.indexers)
  return arrayify(root.indexer)
    .map((raw) => {
      const item = objectValue(raw)
      const id = textValue(item['@id']) || textValue(item.id)
      const name = textValue(item.title) || textValue(item.name) || id
      const configuredValue = textValue(item['@configured'] ?? item.configured).toLowerCase()
      return { id, name, configured: configuredValue !== 'false' }
    })
    .filter((indexer) => indexer.id.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function createJackettClient(config: JackettClientConfig): JackettClient {
  const base = config.baseUrl.replace(/\/$/, '')

  function apiUrl(indexerId: string): URL {
    return new URL(`${base}/api/v2.0/indexers/${encodeURIComponent(indexerId)}/results/torznab/api`)
  }

  async function request(indexerId: string, params: Record<string, string>, signal?: AbortSignal): Promise<string> {
    const url = apiUrl(indexerId)
    url.searchParams.set('apikey', config.apiKey)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    const timeout = AbortSignal.timeout(config.timeoutMs)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
    const response = await fetch(url, { signal: combined })
    if (!response.ok) throw new Error(`Jackett request failed (${response.status})`)
    const xml = await response.text()
    const apiError = parseApiError(xml)
    if (apiError) throw new JackettApiError(apiError.code, apiError.description)
    return xml
  }

  async function search(query: string, options: JackettSearchOptions = {}): Promise<SearchResult[]> {
    const indexerIds = options.indexerIds?.length ? options.indexerIds : ['all']
    const params: Record<string, string> = { t: 'search', q: query }
    if (options.categories?.length) params.cat = options.categories.join(',')

    const batches = await Promise.all(
      indexerIds.map(async (indexerId) => {
        try {
          return parseSearchResults(await request(indexerId, params, options.signal), indexerId)
        } catch (error) {
          logger.warn({ err: error instanceof Error ? error.message : String(error), indexerId }, 'jackett search error')
          return []
        }
      })
    )
    return batches.flat()
  }

  async function ping(): Promise<boolean> {
    try {
      await request('all', { t: 'caps' }, AbortSignal.timeout(Math.min(config.timeoutMs, 3000)))
      return true
    } catch {
      return false
    }
  }

  async function listIndexers(): Promise<JackettIndexer[]> {
    const xml = await request('all', { t: 'indexers', configured: 'true' })
    return parseIndexerList(xml)
  }

  return { search, ping, listIndexers }
}

export const __jackettTestUtils = { parseApiError, parseIndexerList, parseSearchResults }
