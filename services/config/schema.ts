import { z } from 'zod'

const SourceModeSchema = z.enum(['all', 'selected'])
const ConfigUrlSchema = z.union([z.literal(''), z.string().url()]).default('')
const ConfigTextSchema = z.string().default('')

const ProwlarrSelectionSchema = z.object({
  mode: SourceModeSchema.default('all'),
  indexerIds: z.array(z.number().int().positive()).default([]),
})

const JackettSelectionSchema = z.object({
  // Default to all enabled indexers so a configured Jackett URL/API Key actually searches.
  mode: SourceModeSchema.default('all'),
  indexerIds: z.array(z.string().min(1)).default([]),
})

export const AliasarrConnectionsSchema = z.object({
  aliasarrUrl: ConfigUrlSchema,
  prowlarrUrl: ConfigUrlSchema,
  prowlarrDownloadUrl: ConfigUrlSchema,
  jackettUrl: ConfigUrlSchema,
  sonarrUrl: ConfigUrlSchema,
  radarrUrl: ConfigUrlSchema,
  gistId: ConfigTextSchema,
})

export const AliasarrConfigSchema = z.object({
  version: z.literal(1).default(1),
  connections: AliasarrConnectionsSchema.default({}),
  indexers: z
    .object({
      prowlarr: ProwlarrSelectionSchema.default({}),
      jackett: JackettSelectionSchema.default({}),
    })
    .default({}),
})

export type AliasarrConfig = z.infer<typeof AliasarrConfigSchema>
export type AliasarrConnections = z.infer<typeof AliasarrConnectionsSchema>

export const AliasarrSecretsSchema = z.object({
  torznabApiKey: ConfigTextSchema,
  prowlarrApiKey: ConfigTextSchema,
  jackettApiKey: ConfigTextSchema,
  sonarrApiKey: ConfigTextSchema,
  radarrApiKey: ConfigTextSchema,
  gistToken: ConfigTextSchema,
  tmdbApiKey: ConfigTextSchema,
  bangumiAccessToken: ConfigTextSchema,
})

export type AliasarrSecrets = z.infer<typeof AliasarrSecretsSchema>
export type AliasarrSecretName = keyof AliasarrSecrets
export type AliasarrSecretStatus = Record<AliasarrSecretName, boolean>

export function defaultAliasarrConfig(): AliasarrConfig {
  return AliasarrConfigSchema.parse({})
}

export function defaultAliasarrSecrets(): AliasarrSecrets {
  return AliasarrSecretsSchema.parse({})
}

export function aliasarrSecretStatus(secrets: AliasarrSecrets): AliasarrSecretStatus {
  return Object.fromEntries(Object.entries(secrets).map(([name, value]) => [name, value.length > 0])) as AliasarrSecretStatus
}
