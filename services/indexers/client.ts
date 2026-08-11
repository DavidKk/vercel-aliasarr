import type { AliasarrConfig } from '@/services/config'
import type { JackettClient } from '@/services/jackett'
import type { ProwlarrClient } from '@/services/prowlarr/client'
import type { SearchResult } from '@/services/search/types'

export interface IndexerSearchOptions {
  categories?: number[]
  mediaType: 'series' | 'movie'
}

export interface IndexerClient {
  search(query: string, options: IndexerSearchOptions): Promise<SearchResult[]>
  statuses(): Promise<{ prowlarr: boolean; jackett: boolean | null }>
}

export interface IndexerClientConfig {
  prowlarr?: ProwlarrClient
  jackett?: JackettClient
  loadConfig: () => Promise<{ config: AliasarrConfig; exists: boolean }>
  envProwlarrIds?: {
    series?: number[]
    movie?: number[]
  }
}

export function createIndexerClient(config: IndexerClientConfig): IndexerClient {
  async function search(query: string, options: IndexerSearchOptions): Promise<SearchResult[]> {
    const stored = await config.loadConfig()
    const calls: Array<Promise<SearchResult[]>> = []
    const prowlarrSelection = stored.config.indexers.prowlarr
    const jackettSelection = stored.config.indexers.jackett

    if (config.prowlarr && (prowlarrSelection.mode === 'all' || prowlarrSelection.indexerIds.length > 0)) {
      const selectedIds = prowlarrSelection.mode === 'selected' ? prowlarrSelection.indexerIds : stored.exists ? undefined : config.envProwlarrIds?.[options.mediaType]
      calls.push(config.prowlarr.search(query, { categories: options.categories, indexerIds: selectedIds }))
    }

    if (config.jackett && (jackettSelection.mode === 'all' || jackettSelection.indexerIds.length > 0)) {
      const selectedIds = jackettSelection.mode === 'selected' ? jackettSelection.indexerIds : undefined
      calls.push(config.jackett.search(query, { categories: options.categories, indexerIds: selectedIds }))
    }

    return (await Promise.all(calls)).flat()
  }

  async function statuses(): Promise<{ prowlarr: boolean; jackett: boolean | null }> {
    const [prowlarr, jackett] = await Promise.all([
      config.prowlarr ? config.prowlarr.ping() : Promise.resolve(false),
      config.jackett ? config.jackett.ping() : Promise.resolve(null),
    ])
    return { prowlarr, jackett }
  }

  return { search, statuses }
}
