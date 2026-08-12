import { z } from 'zod'

import { DEFAULT_INDEXER_LANGUAGES, toIndexerLocale } from '@/services/indexers/languages'

const SourceModeSchema = z.enum(['all', 'selected'])
const ConfigUrlSchema = z.union([z.literal(''), z.string().url()]).default('')
const ConfigTextSchema = z.string().default('')

/** Extra HTTP headers for upstream *arr / indexer calls (e.g. Cloudflare Access). */
const CustomHeaderRowSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().min(1),
})

export const CustomHeadersSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return []
  const rows: Array<{ name: string; value: string }> = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const name = typeof (entry as { name?: unknown }).name === 'string' ? (entry as { name: string }).name.trim() : ''
    const headerValue = typeof (entry as { value?: unknown }).value === 'string' ? (entry as { value: string }).value.trim() : ''
    if (!name || !headerValue) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ name, value: headerValue })
  }
  return rows
}, z.array(CustomHeaderRowSchema).default([]))

export type CustomHeaderRow = z.infer<typeof CustomHeaderRowSchema>

/** Client draft: `value: null` or `''` keeps the stored secret when the name already exists. */
export const CustomHeaderDraftSchema = z.object({
  name: z.string(),
  value: z.string().nullable(),
})

export type CustomHeaderDraft = z.infer<typeof CustomHeaderDraftSchema>

export const CUSTOM_HEADER_SECRET_NAMES = ['prowlarrHeaders', 'jackettHeaders', 'sonarrHeaders', 'radarrHeaders'] as const
export type CustomHeaderSecretName = (typeof CUSTOM_HEADER_SECRET_NAMES)[number]

/** Convert configured header rows into a fetch-ready record (last duplicate name wins). */
export function customHeadersRecord(headers: CustomHeaderRow[] | undefined): Record<string, string> {
  const next: Record<string, string> = {}
  for (const header of headers ?? []) {
    const name = header.name.trim()
    if (!name) continue
    next[name] = header.value
  }
  return next
}

export function mergeHeaderDrafts(current: CustomHeaderRow[], drafts: CustomHeaderDraft[]): CustomHeaderRow[] {
  const currentByName = new Map(current.map((header) => [header.name.toLowerCase(), header]))
  const next: CustomHeaderRow[] = []
  const seen = new Set<string>()

  for (const draft of drafts) {
    const name = draft.name.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) {
      throw new Error(`Duplicate custom header "${name}"`)
    }
    seen.add(key)

    const incoming = draft.value
    if (incoming == null || incoming === '') {
      const existing = currentByName.get(key)
      if (existing) next.push({ name, value: existing.value })
      continue
    }
    next.push({ name, value: incoming })
  }

  return next
}

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

export type AliasarrStringConnection = keyof z.infer<typeof AliasarrConnectionsSchema>

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
  prowlarrHeaders: CustomHeadersSchema,
  jackettHeaders: CustomHeadersSchema,
  sonarrHeaders: CustomHeadersSchema,
  radarrHeaders: CustomHeadersSchema,
})

export type AliasarrSecrets = z.infer<typeof AliasarrSecretsSchema>
export type AliasarrSecretName = keyof AliasarrSecrets
export type AliasarrStringSecretName = {
  [K in AliasarrSecretName]: AliasarrSecrets[K] extends string ? K : never
}[AliasarrSecretName]
export type AliasarrSecretStatus = Record<AliasarrSecretName, boolean>

export type AliasarrSecretUpdates = {
  [K in AliasarrStringSecretName]?: string | null
} & {
  [K in CustomHeaderSecretName]?: CustomHeaderDraft[]
}

export function defaultAliasarrConfig(): AliasarrConfig {
  return AliasarrConfigSchema.parse({})
}

export function defaultAliasarrSecrets(): AliasarrSecrets {
  return AliasarrSecretsSchema.parse({})
}

export function aliasarrSecretStatus(secrets: AliasarrSecrets): AliasarrSecretStatus {
  return Object.fromEntries(Object.entries(secrets).map(([name, value]) => [name, value.length > 0])) as AliasarrSecretStatus
}

export function customHeaderNames(secrets: AliasarrSecrets): Record<CustomHeaderSecretName, string[]> {
  return {
    prowlarrHeaders: secrets.prowlarrHeaders.map((header) => header.name),
    jackettHeaders: secrets.jackettHeaders.map((header) => header.name),
    sonarrHeaders: secrets.sonarrHeaders.map((header) => header.name),
    radarrHeaders: secrets.radarrHeaders.map((header) => header.name),
  }
}

/** Lift legacy connection-stored headers into secrets once. */
export function migrateLegacyConnectionHeaders(rawConnections: unknown, secrets: AliasarrSecrets): AliasarrSecrets {
  if (!rawConnections || typeof rawConnections !== 'object' || Array.isArray(rawConnections)) return secrets
  const connections = rawConnections as Record<string, unknown>
  const next = { ...secrets }
  for (const name of CUSTOM_HEADER_SECRET_NAMES) {
    if (next[name].length > 0) continue
    next[name] = CustomHeadersSchema.parse(connections[name]) as CustomHeaderRow[]
  }
  return AliasarrSecretsSchema.parse(next)
}

export function isCustomHeaderSecretName(name: string): name is CustomHeaderSecretName {
  return (CUSTOM_HEADER_SECRET_NAMES as readonly string[]).includes(name)
}
