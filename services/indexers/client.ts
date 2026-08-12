import type { AliasarrConfig } from '@/services/config'
import type { JackettClient } from '@/services/jackett'
import type { ProwlarrClient } from '@/services/prowlarr/client'
import type { SearchResult } from '@/services/search/types'
import type { TorznabIndexerScope } from '@/services/torznab/types'

import { effectiveSearchLanguages, indexerLanguagesAllowed, resolveIndexerLanguages } from './languages'

export interface IndexerSearchOptions {
  categories?: number[]
  mediaType: 'series' | 'movie'
  /** Force a single upstream indexer (Aliasarr per-indexer Torznab scope). */
  scope?: TorznabIndexerScope
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

function overrideFor(overrides: Record<string, string[]> | undefined, id: string | number): string[] | undefined {
  return overrides?.[String(id)]
}

export async function resolveProwlarrIndexerIds(
  prowlarr: ProwlarrClient,
  selection: AliasarrConfig['indexers']['prowlarr'],
  languages: string[],
  envFallbackIds: number[] | undefined,
  configExists: boolean
): Promise<number[] | undefined> {
  const wantsLanguageFilter = languages.length > 0
  if (!wantsLanguageFilter && selection.mode === 'all') {
    return configExists ? undefined : envFallbackIds
  }

  if (!wantsLanguageFilter && selection.mode === 'selected') {
    return selection.indexerIds
  }

  const listed = await prowlarr.listIndexers()
  const languageMatched = listed
    .filter((indexer) => indexer.enable !== false)
    .filter((indexer) => {
      const effective = resolveIndexerLanguages(overrideFor(selection.languageOverrides, indexer.id), indexer.language)
      return indexerLanguagesAllowed(effective, languages)
    })
    .map((indexer) => indexer.id)

  if (selection.mode === 'selected') {
    const selected = new Set(selection.indexerIds)
    return languageMatched.filter((id) => selected.has(id))
  }

  if (!configExists && envFallbackIds?.length) {
    const envSet = new Set(envFallbackIds)
    return languageMatched.filter((id) => envSet.has(id))
  }

  return languageMatched
}

export async function resolveJackettIndexerIds(jackett: JackettClient, selection: AliasarrConfig['indexers']['jackett'], languages: string[]): Promise<string[] | undefined> {
  if (!languages.length) {
    return selection.mode === 'selected' ? selection.indexerIds : undefined
  }

  // Jackett has no upstream language field; without overrides a language filter is a no-op.
  const overrides = selection.languageOverrides ?? {}
  if (!Object.keys(overrides).length) {
    return selection.mode === 'selected' ? selection.indexerIds : undefined
  }

  const listed = await jackett.listIndexers()
  const languageMatched = listed
    .filter((indexer) => {
      const effective = resolveIndexerLanguages(overrideFor(overrides, indexer.id), undefined)
      return indexerLanguagesAllowed(effective, languages)
    })
    .map((indexer) => indexer.id)

  if (selection.mode === 'selected') {
    const selected = new Set(selection.indexerIds)
    return languageMatched.filter((id) => selected.has(id))
  }

  // Prefer a single `all` query when the filter did not exclude anyone.
  if (languageMatched.length === listed.length) return undefined
  return languageMatched
}

/** Resolve concrete indexer ids for sync (never undefined/"all" — expands to listed ids). */
export async function listProwlarrIndexerTargets(
  prowlarr: ProwlarrClient,
  selection: AliasarrConfig['indexers']['prowlarr'],
  languages: string[],
  envFallbackIds: number[] | undefined,
  configExists: boolean
): Promise<Array<{ id: string; name: string }>> {
  const listed = await prowlarr.listIndexers()
  const enabled = listed.filter((indexer) => indexer.enable !== false)
  const ids = await resolveProwlarrIndexerIds(prowlarr, selection, languages, envFallbackIds, configExists)
  const allowed = ids == null ? null : new Set(ids)
  return enabled
    .filter((indexer) => (allowed == null ? true : allowed.has(indexer.id)))
    .filter((indexer) => {
      if (!languages.length) return true
      const effective = resolveIndexerLanguages(overrideFor(selection.languageOverrides, indexer.id), indexer.language)
      return indexerLanguagesAllowed(effective, languages)
    })
    .map((indexer) => ({ id: String(indexer.id), name: indexer.name }))
}

export async function listJackettIndexerTargets(
  jackett: JackettClient,
  selection: AliasarrConfig['indexers']['jackett'],
  languages: string[]
): Promise<Array<{ id: string; name: string }>> {
  const listed = await jackett.listIndexers()
  const ids = await resolveJackettIndexerIds(jackett, selection, languages)
  const allowed = ids == null ? null : new Set(ids)
  return listed
    .filter((indexer) => (allowed == null ? true : allowed.has(indexer.id)))
    .filter((indexer) => {
      if (!languages.length) return true
      const overrides = selection.languageOverrides ?? {}
      if (!Object.keys(overrides).length) return true
      const effective = resolveIndexerLanguages(overrideFor(overrides, indexer.id), undefined)
      return indexerLanguagesAllowed(effective, languages)
    })
    .map((indexer) => ({ id: indexer.id, name: indexer.name }))
}

export function createIndexerClient(config: IndexerClientConfig): IndexerClient {
  async function search(query: string, options: IndexerSearchOptions): Promise<SearchResult[]> {
    const stored = await config.loadConfig()
    const calls: Array<Promise<SearchResult[]>> = []
    const prowlarrSelection = stored.config.indexers.prowlarr
    const jackettSelection = stored.config.indexers.jackett
    const languages = effectiveSearchLanguages(stored.config.indexers.languages)

    if (options.scope?.provider === 'prowlarr') {
      if (!config.prowlarr) return []
      const id = Number(options.scope.indexerId)
      if (!Number.isFinite(id)) return []
      return config.prowlarr.search(query, { categories: options.categories, indexerIds: [id] })
    }

    if (options.scope?.provider === 'jackett') {
      if (!config.jackett) return []
      return config.jackett.search(query, { categories: options.categories, indexerIds: [options.scope.indexerId] })
    }

    if (config.prowlarr && (prowlarrSelection.mode === 'all' || prowlarrSelection.indexerIds.length > 0)) {
      const selectedIds = await resolveProwlarrIndexerIds(config.prowlarr, prowlarrSelection, languages, config.envProwlarrIds?.[options.mediaType], stored.exists)
      if (languages.length > 0 && Array.isArray(selectedIds) && selectedIds.length === 0) {
        // no-op
      } else {
        calls.push(config.prowlarr.search(query, { categories: options.categories, indexerIds: selectedIds }))
      }
    }

    if (config.jackett && (jackettSelection.mode === 'all' || jackettSelection.indexerIds.length > 0)) {
      const selectedIds = await resolveJackettIndexerIds(config.jackett, jackettSelection, languages)
      if (languages.length > 0 && Array.isArray(selectedIds) && selectedIds.length === 0) {
        // no-op
      } else {
        calls.push(config.jackett.search(query, { categories: options.categories, indexerIds: selectedIds }))
      }
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
