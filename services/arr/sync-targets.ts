import { type AliasarrIndexerTarget, aliasarrManagedIndexerName, type ArrApplication } from '@/services/arr/client'
import { type AliasarrConfig, type AliasarrSecrets, customHeadersRecord, loadAliasarrConfig } from '@/services/config'
import { listJackettIndexerTargets, listProwlarrIndexerTargets } from '@/services/indexers'
import { effectiveSearchLanguages } from '@/services/indexers/languages'
import { createJackettClient } from '@/services/jackett'
import { createProwlarrClient } from '@/services/prowlarr/client'
import type { TorznabIndexerProvider } from '@/services/torznab/types'
import { getEnv } from '@/utils/env'

/** Derive public origin from stored Aliasarr Torznab URL (`…/api/torznab`). */
export function aliasarrPublicOrigin(aliasarrUrl: string): string {
  const trimmed = aliasarrUrl.replace(/\/+$/, '')
  const suffix = '/api/torznab'
  if (trimmed.toLowerCase().endsWith(suffix)) {
    return trimmed.slice(0, -suffix.length)
  }
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed
  }
}

export function scopedTorznabBaseUrl(origin: string, provider: TorznabIndexerProvider, indexerId: string): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}/api/torznab/${provider}/${encodeURIComponent(indexerId)}`
}

export async function buildAliasarrIndexerTargets(input: {
  config: AliasarrConfig
  secrets: AliasarrSecrets
  exists: boolean
  aliasarrUrl: string
  apiKey: string
}): Promise<{ targets: AliasarrIndexerTarget[]; failedProviders: TorznabIndexerProvider[] }> {
  const env = getEnv()
  const languages = effectiveSearchLanguages(input.config.indexers.languages)
  const origin = aliasarrPublicOrigin(input.aliasarrUrl)
  const targets: AliasarrIndexerTarget[] = []
  const providerErrors: string[] = []
  const failedProviders: TorznabIndexerProvider[] = []

  const prowlarrUrl = input.config.connections.prowlarrUrl
  const prowlarrSelection = input.config.indexers.prowlarr
  if (prowlarrUrl && input.secrets.prowlarrApiKey && (prowlarrSelection.mode === 'all' || prowlarrSelection.indexerIds.length > 0)) {
    try {
      const prowlarr = createProwlarrClient({
        baseUrl: prowlarrUrl,
        apiKey: input.secrets.prowlarrApiKey,
        timeoutMs: env.PROWLARR_TIMEOUT_MS,
        headers: customHeadersRecord(input.secrets.prowlarrHeaders),
      })
      const listed = await listProwlarrIndexerTargets(prowlarr, prowlarrSelection, languages, env.PROWLARR_INDEXER_IDS, input.exists)
      for (const indexer of listed) {
        targets.push({
          name: aliasarrManagedIndexerName(indexer.name, 'prowlarr'),
          baseUrl: scopedTorznabBaseUrl(origin, 'prowlarr', indexer.id),
          apiKey: input.apiKey,
        })
      }
    } catch (error) {
      failedProviders.push('prowlarr')
      providerErrors.push(`Prowlarr: ${error instanceof Error ? error.message : 'failed to list indexers'}`)
    }
  }

  const jackettUrl = input.config.connections.jackettUrl
  const jackettSelection = input.config.indexers.jackett
  if (jackettUrl && input.secrets.jackettApiKey && (jackettSelection.mode === 'all' || jackettSelection.indexerIds.length > 0)) {
    try {
      const jackett = createJackettClient({
        baseUrl: jackettUrl,
        apiKey: input.secrets.jackettApiKey,
        timeoutMs: env.JACKETT_TIMEOUT_MS,
        headers: customHeadersRecord(input.secrets.jackettHeaders),
      })
      const listed = await listJackettIndexerTargets(jackett, jackettSelection, languages)
      for (const indexer of listed) {
        targets.push({
          name: aliasarrManagedIndexerName(indexer.name, 'jackett'),
          baseUrl: scopedTorznabBaseUrl(origin, 'jackett', indexer.id),
          apiKey: input.apiKey,
        })
      }
    } catch (error) {
      failedProviders.push('jackett')
      providerErrors.push(`Jackett: ${error instanceof Error ? error.message : 'failed to list indexers'}`)
    }
  }

  // Do not prune managed entries when every upstream listing failed (transient outage).
  if (targets.length === 0 && providerErrors.length > 0) {
    throw new Error(providerErrors.join(' · '))
  }

  return { targets, failedProviders }
}

export async function loadAliasarrIndexerTargetsForSync(): Promise<{
  targets: AliasarrIndexerTarget[]
  failedProviders: TorznabIndexerProvider[]
  aliasarrUrl: string
  apiKey: string
}> {
  const stored = await loadAliasarrConfig()
  const aliasarrUrl = stored.config.connections.aliasarrUrl
  const apiKey = stored.secrets.torznabApiKey
  if (!aliasarrUrl) throw new Error('Configure the public Aliasarr URL before application sync')
  if (!apiKey) throw new Error('Configure the Torznab API key before application sync')
  const { targets, failedProviders } = await buildAliasarrIndexerTargets({
    config: stored.config,
    secrets: stored.secrets,
    exists: stored.exists,
    aliasarrUrl,
    apiKey,
  })
  return { targets, failedProviders, aliasarrUrl, apiKey }
}

export function applicationConnectionConfig(application: ArrApplication, config: AliasarrConfig, secrets: AliasarrSecrets) {
  const baseUrl = application === 'sonarr' ? config.connections.sonarrUrl : config.connections.radarrUrl
  const apiKey = application === 'sonarr' ? secrets.sonarrApiKey : secrets.radarrApiKey
  if (!baseUrl || !apiKey) return null
  return {
    application,
    baseUrl,
    apiKey,
    headers: customHeadersRecord(application === 'sonarr' ? secrets.sonarrHeaders : secrets.radarrHeaders),
  }
}
