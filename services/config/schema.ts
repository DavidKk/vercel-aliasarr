import { z } from 'zod'

import { DEFAULT_INDEXER_LANGUAGES, toIndexerLocale } from '@/services/indexers/languages'

const SourceModeSchema = z.enum(['all', 'selected'])
const ConfigUrlSchema = z.union([z.literal(''), z.string().url()]).default('')
const ConfigTextSchema = z.string().default('')

const LanguageOverridesSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const next: Record<string, string[]> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === 'string' && entry.trim()) {
        next[key] = [toIndexerLocale(entry)]
        continue
      }
      if (!Array.isArray(entry)) continue
      const locales = [...new Set(entry.map((item) => (typeof item === 'string' ? toIndexerLocale(item) : '')).filter(Boolean))]
      if (locales.length) next[key] = locales
    }
    return next
  },
  z.record(z.array(z.string().min(1)).min(1)).default({})
)

const ProwlarrSelectionSchema = z.object({
  mode: SourceModeSchema.default('all'),
  indexerIds: z.array(z.number().int().positive()).default([]),
  /** Per-indexer language overrides keyed by indexer id. Missing/empty = use upstream default. */
  languageOverrides: LanguageOverridesSchema,
})

const JackettSelectionSchema = z.object({
  // Default to all enabled indexers so a configured Jackett URL/API Key actually searches.
  mode: SourceModeSchema.default('all'),
  indexerIds: z.array(z.string().min(1)).default([]),
  /** Per-indexer language overrides keyed by indexer id. Missing/empty = unset (unknown). */
  languageOverrides: LanguageOverridesSchema,
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

const LanguagesSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return [...DEFAULT_INDEXER_LANGUAGES]
    if (!Array.isArray(value)) return value
    return [...new Set(value.map((item) => (typeof item === 'string' ? toIndexerLocale(item) : '')).filter(Boolean))]
  },
  z
    .array(z.string().min(1))
    .min(1, 'Select at least one search language')
    .default([...DEFAULT_INDEXER_LANGUAGES])
)

export const AliasarrConfigSchema = z.object({
  version: z.literal(1).default(1),
  connections: AliasarrConnectionsSchema.default({}),
  indexers: z
    .object({
      /** Selected search languages. Defaults to all known options; at least one required. */
      languages: LanguagesSchema,
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
