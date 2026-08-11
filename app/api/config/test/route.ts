import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { createArrClient } from '@/services/arr'
import {
  type AliasarrConnections,
  AliasarrConnectionsSchema,
  type AliasarrSecretName,
  AliasarrSecretsSchema,
  type AliasarrSecretUpdates,
  CustomHeaderDraftSchema,
  customHeadersRecord,
  loadAliasarrConfig,
  mergeSecretUpdates,
} from '@/services/config'
import { fetchGist } from '@/services/gist'
import { createJackettClient } from '@/services/jackett'
import { createProwlarrClient } from '@/services/prowlarr/client'
import { getEnv } from '@/utils/env'

export const runtime = 'nodejs'

const ServiceSchema = z.enum(['aliasarr', 'gist', 'tmdb', 'bangumi', 'prowlarr', 'jackett', 'sonarr', 'radarr'])
type TestableService = z.infer<typeof ServiceSchema>

const SecretUpdatesSchema = AliasarrSecretsSchema.partial()
  .omit({
    prowlarrHeaders: true,
    jackettHeaders: true,
    sonarrHeaders: true,
    radarrHeaders: true,
  })
  .extend({
    prowlarrHeaders: z.array(CustomHeaderDraftSchema).optional(),
    jackettHeaders: z.array(CustomHeaderDraftSchema).optional(),
    sonarrHeaders: z.array(CustomHeaderDraftSchema).optional(),
    radarrHeaders: z.array(CustomHeaderDraftSchema).optional(),
  })

const TestRequestSchema = z.object({
  service: ServiceSchema,
  // Keep inbound connections as plain strings; only the active service fields are schema-validated below.
  connections: z
    .object({
      aliasarrUrl: z.string().optional(),
      prowlarrUrl: z.string().optional(),
      prowlarrDownloadUrl: z.string().optional(),
      jackettUrl: z.string().optional(),
      sonarrUrl: z.string().optional(),
      radarrUrl: z.string().optional(),
      gistId: z.string().optional(),
    })
    .partial()
    .optional(),
  secrets: SecretUpdatesSchema.optional(),
})

const serviceConnections: Record<TestableService, Array<keyof AliasarrConnections>> = {
  aliasarr: ['aliasarrUrl'],
  gist: ['gistId'],
  tmdb: [],
  bangumi: [],
  prowlarr: ['prowlarrUrl'],
  jackett: ['jackettUrl'],
  sonarr: ['sonarrUrl'],
  radarr: ['radarrUrl'],
}

const serviceSecrets: Record<TestableService, AliasarrSecretName[]> = {
  aliasarr: ['torznabApiKey'],
  gist: ['gistToken'],
  tmdb: ['tmdbApiKey'],
  bangumi: ['bangumiAccessToken'],
  prowlarr: ['prowlarrApiKey', 'prowlarrHeaders'],
  jackett: ['jackettApiKey', 'jackettHeaders'],
  sonarr: ['sonarrApiKey', 'sonarrHeaders'],
  radarr: ['radarrApiKey', 'radarrHeaders'],
}

function required(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} is required`)
  return value.trim()
}

function pickConnections(stored: AliasarrConnections, incoming: Partial<AliasarrConnections> | undefined, service: TestableService): Partial<AliasarrConnections> {
  const picked: Partial<AliasarrConnections> = {}
  for (const name of serviceConnections[service]) {
    const value = incoming && Object.prototype.hasOwnProperty.call(incoming, name) ? incoming[name] : stored[name]
    picked[name] = AliasarrConnectionsSchema.shape[name].parse(value) as never
  }
  return picked
}

function pickSecretUpdates(updates: AliasarrSecretUpdates | undefined, service: TestableService): AliasarrSecretUpdates {
  if (!updates) return {}
  const allowed = new Set<AliasarrSecretName>(serviceSecrets[service])
  return Object.fromEntries(Object.entries(updates).filter(([name]) => allowed.has(name as AliasarrSecretName))) as AliasarrSecretUpdates
}

async function expectOk(url: URL | string, init: RequestInit, label: string): Promise<void> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`)
}

export const POST = api(
  withAuthHandler(async (req: NextRequest) => {
    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return jsonInvalidParameters('Invalid JSON body')
    }
    const parsed = TestRequestSchema.safeParse(payload)
    if (!parsed.success) return jsonInvalidParameters(parsed.error.message)

    const service = parsed.data.service
    const stored = await loadAliasarrConfig()
    let connections: Partial<AliasarrConnections>
    try {
      connections = pickConnections(stored.config.connections, parsed.data.connections, service)
    } catch (error) {
      return jsonInvalidParameters(error instanceof Error ? error.message : 'Invalid connection fields')
    }
    const secrets = mergeSecretUpdates(stored.secrets, pickSecretUpdates(parsed.data.secrets, service))
    const env = getEnv()
    const startedAt = Date.now()

    try {
      switch (service) {
        case 'aliasarr': {
          const baseUrl = required(connections.aliasarrUrl ?? '', 'Aliasarr URL').replace(/\/+$/, '')
          const url = new URL(baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`)
          url.searchParams.set('t', 'caps')
          url.searchParams.set('apikey', required(secrets.torznabApiKey, 'Server API key'))
          await expectOk(url, {}, 'Aliasarr')
          break
        }
        case 'gist':
          await fetchGist({ gistId: required(connections.gistId ?? '', 'Gist ID'), gistToken: required(secrets.gistToken, 'Gist token') }, { forceFresh: true })
          break
        case 'tmdb': {
          const url = new URL('https://api.themoviedb.org/3/configuration')
          url.searchParams.set('api_key', required(secrets.tmdbApiKey, 'TMDB API key'))
          await expectOk(url, {}, 'TMDB')
          break
        }
        case 'bangumi':
          await expectOk(
            'https://api.bgm.tv/v0/me',
            { headers: { Authorization: `Bearer ${required(secrets.bangumiAccessToken, 'Bangumi access token')}`, 'User-Agent': 'Aliasarr/0.2' } },
            'Bangumi'
          )
          break
        case 'prowlarr': {
          await createProwlarrClient({
            baseUrl: required(connections.prowlarrUrl ?? '', 'Prowlarr URL'),
            apiKey: required(secrets.prowlarrApiKey, 'Prowlarr API key'),
            timeoutMs: env.PROWLARR_TIMEOUT_MS,
            headers: customHeadersRecord(secrets.prowlarrHeaders),
          }).probe!()
          break
        }
        case 'jackett': {
          await createJackettClient({
            baseUrl: required(connections.jackettUrl ?? '', 'Jackett URL'),
            apiKey: required(secrets.jackettApiKey, 'Jackett API key'),
            timeoutMs: env.JACKETT_TIMEOUT_MS,
            headers: customHeadersRecord(secrets.jackettHeaders),
          }).probe!()
          break
        }
        case 'sonarr':
        case 'radarr': {
          const baseUrl = service === 'sonarr' ? connections.sonarrUrl : connections.radarrUrl
          const apiKey = service === 'sonarr' ? secrets.sonarrApiKey : secrets.radarrApiKey
          const headers = customHeadersRecord(service === 'sonarr' ? secrets.sonarrHeaders : secrets.radarrHeaders)
          await createArrClient({
            application: service,
            baseUrl: required(baseUrl ?? '', `${service} URL`),
            apiKey: required(apiKey, `${service} API key`),
            headers,
          }).ping()
          break
        }
      }
      return jsonSuccess({ service, latencyMs: Date.now() - startedAt })
    } catch (error) {
      return standardResponseError(error instanceof Error ? error.message : 'Connection test failed', { code: 3002, data: { service } }).toJsonResponse(502)
    }
  })
)
