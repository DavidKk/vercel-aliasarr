import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { getAppRuntime, resetAppRuntime } from '@/services/app/runtime'
import {
  type AliasarrConfig,
  AliasarrConfigSchema,
  type AliasarrSecretName,
  AliasarrSecretsSchema,
  ConfigRevisionConflictError,
  loadAliasarrConfig,
  mergeSecretUpdates,
  saveAliasarrConfig,
} from '@/services/config'

export const runtime = 'nodejs'

const SecretUpdatesSchema = AliasarrSecretsSchema.partial().extend({
  torznabApiKey: z.string().min(16).nullable().optional(),
})

const ConfigSectionSchema = z.enum(['services', 'indexers', 'applications'])
type ConfigSection = z.infer<typeof ConfigSectionSchema>

const connectionNames: Record<ConfigSection, Array<keyof AliasarrConfig['connections']>> = {
  services: ['aliasarrUrl', 'gistId'],
  indexers: ['prowlarrUrl', 'prowlarrDownloadUrl', 'jackettUrl'],
  applications: ['sonarrUrl', 'radarrUrl'],
}

const secretNames: Record<ConfigSection, AliasarrSecretName[]> = {
  services: ['torznabApiKey', 'gistToken', 'tmdbApiKey', 'bangumiAccessToken'],
  indexers: ['prowlarrApiKey', 'jackettApiKey'],
  applications: ['sonarrApiKey', 'radarrApiKey'],
}

function mergeSectionConfig(current: AliasarrConfig, incoming: AliasarrConfig, section: ConfigSection): AliasarrConfig {
  const connections = { ...current.connections }
  for (const name of connectionNames[section]) connections[name] = incoming.connections[name]
  return {
    ...current,
    connections,
    indexers: section === 'indexers' ? incoming.indexers : current.indexers,
  }
}

function sectionSecretUpdates(updates: z.infer<typeof SecretUpdatesSchema>, section: ConfigSection): Partial<Record<AliasarrSecretName, string | null | undefined>> {
  const allowed = new Set<AliasarrSecretName>(secretNames[section])
  return Object.fromEntries(Object.entries(updates).filter(([name]) => allowed.has(name as AliasarrSecretName)))
}

export const GET = api(
  withAuthHandler(async () => {
    const stored = await loadAliasarrConfig()
    return jsonSuccess({
      config: stored.config,
      secretStatus: stored.secretStatus,
      configured: stored.configured,
      exists: stored.exists,
      revision: stored.revision,
      storage: stored.storage,
      encrypted: stored.encrypted,
    })
  })
)

export const PUT = api(
  withAuthHandler(async (req: NextRequest) => {
    let body: { config?: unknown; secrets?: unknown; revision?: string | null; section?: unknown }
    try {
      body = await req.json()
    } catch {
      return jsonInvalidParameters('Invalid JSON body')
    }

    const parsed = AliasarrConfigSchema.safeParse(body.config)
    if (!parsed.success) return jsonInvalidParameters(parsed.error.message)
    const parsedSecrets = SecretUpdatesSchema.safeParse(body.secrets ?? {})
    if (!parsedSecrets.success) return jsonInvalidParameters(parsedSecrets.error.message)
    const parsedSection = ConfigSectionSchema.safeParse(body.section)
    if (!parsedSection.success) return jsonInvalidParameters(parsedSection.error.message)

    try {
      const current = await loadAliasarrConfig()
      const config = mergeSectionConfig(current.config, parsed.data, parsedSection.data)
      const secrets = mergeSecretUpdates(current.secrets, sectionSecretUpdates(parsedSecrets.data, parsedSection.data))
      const saved = await saveAliasarrConfig(config, secrets, body.revision ?? null)
      const runtime = await getAppRuntime()
      await runtime.cache.clear?.()
      resetAppRuntime()
      return jsonSuccess({ revision: saved.revision })
    } catch (error) {
      if (error instanceof ConfigRevisionConflictError) {
        return standardResponseError('Configuration changed remotely. Reload before saving.', {
          code: 1002,
          data: { expectedRevision: error.expectedRevision, actualRevision: error.actualRevision },
        }).toJsonResponse(409)
      }
      return jsonInvalidParameters(error instanceof Error ? error.message : 'Configuration save failed')
    }
  })
)
