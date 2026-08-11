import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Redis } from '@upstash/redis'

import { getEnv } from '@/utils/env'

import { decryptConfigPayload, encryptConfigPayload, type EncryptedConfigPayload, EncryptedConfigPayloadSchema } from './crypto'
import {
  type AliasarrConfig,
  AliasarrConfigSchema,
  type AliasarrConnections,
  AliasarrConnectionsSchema,
  type AliasarrSecrets,
  AliasarrSecretsSchema,
  aliasarrSecretStatus,
  type AliasarrSecretUpdates,
  defaultAliasarrConfig,
  defaultAliasarrSecrets,
  isCustomHeaderSecretName,
  mergeHeaderDrafts,
  migrateLegacyConnectionHeaders,
} from './schema'

export const ALIASARR_CONFIG_KEY = 'aliasarr:config:v1'
export const LOCAL_CONFIG_FILE = '.aliasarr/config.json'

interface ConfigRecord {
  revision: string
  config: AliasarrConfig
  encryptedConfig?: EncryptedConfigPayload
}

export interface StoredAliasarrConfig {
  config: AliasarrConfig
  secrets: AliasarrSecrets
  secretStatus: ReturnType<typeof aliasarrSecretStatus>
  configured: boolean
  exists: boolean
  revision: string | null
  storage: 'local-file' | 'vercel-kv'
  encrypted: boolean
}

export class ConfigRevisionConflictError extends Error {
  constructor(
    public readonly expectedRevision: string | null,
    public readonly actualRevision: string | null
  ) {
    super('Configuration revision conflict')
    this.name = 'ConfigRevisionConflictError'
  }
}

function localConfigPath(): string {
  return path.join(process.cwd(), LOCAL_CONFIG_FILE)
}

function kvCredentials(): { url: string; token: string } | null {
  const env = getEnv()
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

function createRedis(credentials: { url: string; token: string }): Redis {
  return new Redis(credentials)
}

function normalizeRecord(value: unknown): ConfigRecord | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { revision?: unknown; config?: unknown; encryptedConfig?: unknown }
  if (typeof candidate.revision !== 'string') return null
  return {
    revision: candidate.revision,
    config: AliasarrConfigSchema.parse(candidate.config),
    encryptedConfig: candidate.encryptedConfig == null ? undefined : EncryptedConfigPayloadSchema.parse(candidate.encryptedConfig),
  }
}

function environmentConnections(): AliasarrConnections {
  // One-time compatibility path for existing deployments. Once an encrypted
  // record exists these legacy variables are ignored and can be deleted.
  return AliasarrConnectionsSchema.parse({
    aliasarrUrl: process.env.ALIASARR_URL,
    prowlarrUrl: process.env.PROWLARR_URL,
    prowlarrDownloadUrl: process.env.PROWLARR_SONARR_URL,
    jackettUrl: process.env.JACKETT_URL,
    sonarrUrl: process.env.SONARR_URL,
    radarrUrl: process.env.RADARR_URL,
    gistId: process.env.GIST_ID,
  })
}

function environmentSecrets(): AliasarrSecrets {
  // Never expose these values through the config API; they are only imported
  // into the encrypted bundle on the first authenticated save.
  return AliasarrSecretsSchema.parse({
    torznabApiKey: process.env.TORZNAB_API_KEY,
    prowlarrApiKey: process.env.PROWLARR_API_KEY,
    jackettApiKey: process.env.JACKETT_API_KEY,
    sonarrApiKey: process.env.SONARR_API_KEY,
    radarrApiKey: process.env.RADARR_API_KEY,
    gistToken: process.env.GIST_TOKEN,
    tmdbApiKey: process.env.TMDB_API_KEY,
    bangumiAccessToken: process.env.BANGUMI_ACCESS_TOKEN,
  })
}

function mergeConnections(primary: AliasarrConnections, fallback: AliasarrConnections): AliasarrConnections {
  return AliasarrConnectionsSchema.parse(
    Object.fromEntries(Object.keys(fallback).map((name) => [name, primary[name as keyof AliasarrConnections] || fallback[name as keyof AliasarrConnections]]))
  )
}

function resolveRecord(record: ConfigRecord | null): { config: AliasarrConfig; secrets: AliasarrSecrets; encrypted: boolean } {
  const fallbackConnections = environmentConnections()
  const fallbackSecrets = environmentSecrets()
  if (!record) {
    const config = defaultAliasarrConfig()
    return { config: { ...config, connections: fallbackConnections }, secrets: fallbackSecrets, encrypted: false }
  }

  if (!record.encryptedConfig) {
    return {
      config: { ...record.config, connections: mergeConnections(record.config.connections, fallbackConnections) },
      secrets: fallbackSecrets,
      encrypted: false,
    }
  }

  const encryptionKey = getEnv().CONFIG_ENCRYPTION_KEY
  if (!encryptionKey) throw new Error('CONFIG_ENCRYPTION_KEY is required to decrypt Aliasarr configuration')
  const raw = decryptConfigPayload<{ connections?: unknown; secrets?: unknown }>(record.encryptedConfig, encryptionKey)
  const secrets = migrateLegacyConnectionHeaders(raw.connections, AliasarrSecretsSchema.parse(raw.secrets ?? {}))
  const connections = AliasarrConnectionsSchema.parse(raw.connections ?? {})
  return {
    config: { ...record.config, connections },
    secrets,
    encrypted: true,
  }
}

async function readLocalRecord(): Promise<ConfigRecord | null> {
  try {
    return normalizeRecord(JSON.parse(await readFile(localConfigPath(), 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function writeLocalRecord(record: ConfigRecord, expectedRevision: string | null): Promise<void> {
  const current = await readLocalRecord()
  if ((current?.revision ?? null) !== expectedRevision) {
    throw new ConfigRevisionConflictError(expectedRevision, current?.revision ?? null)
  }

  const file = localConfigPath()
  const tempFile = `${file}.${createHash('sha1').update(randomUUID()).digest('hex')}.tmp`
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(tempFile, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(tempFile, file)
}

function storedResult(record: ConfigRecord | null, storage: StoredAliasarrConfig['storage'], configured: boolean): StoredAliasarrConfig {
  const resolved = resolveRecord(record)
  return {
    ...resolved,
    secretStatus: aliasarrSecretStatus(resolved.secrets),
    configured,
    exists: record != null,
    revision: record?.revision ?? null,
    storage,
  }
}

export async function loadAliasarrConfig(): Promise<StoredAliasarrConfig> {
  if (process.env.NODE_ENV !== 'production') {
    return storedResult(await readLocalRecord(), 'local-file', true)
  }

  const credentials = kvCredentials()
  if (!credentials) return storedResult(null, 'vercel-kv', false)
  return storedResult(normalizeRecord(await createRedis(credentials).get(ALIASARR_CONFIG_KEY)), 'vercel-kv', true)
}

function encryptedRecord(config: AliasarrConfig, secrets: AliasarrSecrets): ConfigRecord {
  const encryptionKey = getEnv().CONFIG_ENCRYPTION_KEY
  if (!encryptionKey) throw new Error('CONFIG_ENCRYPTION_KEY is required before saving Aliasarr configuration')
  const normalizedConfig = AliasarrConfigSchema.parse(config)
  const normalizedSecrets = AliasarrSecretsSchema.parse(secrets)
  return {
    revision: randomUUID(),
    config: { ...normalizedConfig, connections: defaultAliasarrConfig().connections },
    encryptedConfig: encryptConfigPayload({ connections: normalizedConfig.connections, secrets: normalizedSecrets }, encryptionKey),
  }
}

export async function saveAliasarrConfig(config: AliasarrConfig, secrets: AliasarrSecrets, expectedRevision: string | null): Promise<{ revision: string }> {
  const record = encryptedRecord(config, secrets)

  if (process.env.NODE_ENV !== 'production') {
    await writeLocalRecord(record, expectedRevision)
    return { revision: record.revision }
  }

  const credentials = kvCredentials()
  if (!credentials) throw new Error('Vercel KV is not configured')

  const script = `
    local current = redis.call('GET', KEYS[1])
    local expected = ARGV[1]
    if current then
      local decoded = cjson.decode(current)
      if expected == '__missing__' or decoded.revision ~= expected then
        return {0, decoded.revision}
      end
    elseif expected ~= '__missing__' then
      return {0, ''}
    end
    redis.call('SET', KEYS[1], ARGV[2])
    return {1, ARGV[3]}
  `
  const result = await createRedis(credentials).eval<string[], [number, string]>(
    script,
    [ALIASARR_CONFIG_KEY],
    [expectedRevision ?? '__missing__', JSON.stringify(record), record.revision]
  )
  if (Number(result[0]) !== 1) {
    throw new ConfigRevisionConflictError(expectedRevision, result[1] || null)
  }
  return { revision: record.revision }
}

export function mergeSecretUpdates(current: AliasarrSecrets, updates: AliasarrSecretUpdates): AliasarrSecrets {
  const next: AliasarrSecrets = { ...current }
  for (const [name, value] of Object.entries(updates) as Array<[keyof AliasarrSecrets, AliasarrSecretUpdates[keyof AliasarrSecretUpdates]]>) {
    if (value === undefined) continue
    if (isCustomHeaderSecretName(name)) {
      if (!Array.isArray(value)) continue
      next[name] = mergeHeaderDrafts(current[name], value)
      continue
    }
    if (typeof value !== 'string' && value !== null) continue
    if (value === '') continue
    next[name] = value === null ? '' : value
  }
  return AliasarrSecretsSchema.parse(next)
}

export function emptyAliasarrSecrets(): AliasarrSecrets {
  return defaultAliasarrSecrets()
}
