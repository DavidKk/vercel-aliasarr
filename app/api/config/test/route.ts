import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { createArrClient } from '@/services/arr'
import { AliasarrConnectionsSchema, AliasarrSecretsSchema, loadAliasarrConfig, mergeSecretUpdates } from '@/services/config'
import { fetchGist } from '@/services/gist'
import { createJackettClient } from '@/services/jackett'
import { createProwlarrClient } from '@/services/prowlarr/client'
import { getEnv } from '@/utils/env'

export const runtime = 'nodejs'

const ServiceSchema = z.enum(['aliasarr', 'gist', 'tmdb', 'bangumi', 'prowlarr', 'jackett', 'sonarr', 'radarr'])
const TestRequestSchema = z.object({
  service: ServiceSchema,
  connections: AliasarrConnectionsSchema.partial().optional(),
  secrets: AliasarrSecretsSchema.partial().optional(),
})

function required(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} is required`)
  return value.trim()
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

    const stored = await loadAliasarrConfig()
    const connections = AliasarrConnectionsSchema.parse({ ...stored.config.connections, ...parsed.data.connections })
    const secrets = mergeSecretUpdates(stored.secrets, parsed.data.secrets ?? {})
    const env = getEnv()
    const startedAt = Date.now()

    try {
      switch (parsed.data.service) {
        case 'aliasarr': {
          const baseUrl = required(connections.aliasarrUrl, 'Aliasarr URL').replace(/\/+$/, '')
          const url = new URL(baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`)
          url.searchParams.set('t', 'caps')
          url.searchParams.set('apikey', required(secrets.torznabApiKey, 'Server API key'))
          await expectOk(url, {}, 'Aliasarr')
          break
        }
        case 'gist':
          await fetchGist({ gistId: required(connections.gistId, 'Gist ID'), gistToken: required(secrets.gistToken, 'Gist token') }, { forceFresh: true })
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
          const ok = await createProwlarrClient({
            baseUrl: required(connections.prowlarrUrl, 'Prowlarr URL'),
            apiKey: required(secrets.prowlarrApiKey, 'Prowlarr API key'),
            timeoutMs: env.PROWLARR_TIMEOUT_MS,
          }).ping()
          if (!ok) throw new Error('Prowlarr is unreachable or rejected the API key')
          break
        }
        case 'jackett': {
          const ok = await createJackettClient({
            baseUrl: required(connections.jackettUrl, 'Jackett URL'),
            apiKey: required(secrets.jackettApiKey, 'Jackett API key'),
            timeoutMs: env.JACKETT_TIMEOUT_MS,
          }).ping()
          if (!ok) throw new Error('Jackett is unreachable or rejected the API key')
          break
        }
        case 'sonarr':
        case 'radarr': {
          const application = parsed.data.service
          const baseUrl = application === 'sonarr' ? connections.sonarrUrl : connections.radarrUrl
          const apiKey = application === 'sonarr' ? secrets.sonarrApiKey : secrets.radarrApiKey
          const status = await createArrClient({ application, baseUrl: required(baseUrl, `${application} URL`), apiKey: required(apiKey, `${application} API key`) }).status()
          if (!status.reachable) throw new Error(`${application} is unreachable or rejected the API key`)
          break
        }
      }
      return jsonSuccess({ service: parsed.data.service, latencyMs: Date.now() - startedAt })
    } catch (error) {
      return standardResponseError(error instanceof Error ? error.message : 'Connection test failed', { code: 3002, data: { service: parsed.data.service } }).toJsonResponse(502)
    }
  })
)
