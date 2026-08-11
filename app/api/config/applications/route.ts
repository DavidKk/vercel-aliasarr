import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { type ArrApplication, createArrClient } from '@/services/arr'
import { type AliasarrConfig, type AliasarrSecrets, loadAliasarrConfig } from '@/services/config'

export const runtime = 'nodejs'

const ActionSchema = z.object({
  application: z.enum(['sonarr', 'radarr']),
  action: z.enum(['sync', 'remove']),
})
const ApplicationSchema = z.enum(['sonarr', 'radarr'])

function applicationConfig(application: ArrApplication, config: AliasarrConfig, secrets: AliasarrSecrets) {
  const baseUrl = application === 'sonarr' ? config.connections.sonarrUrl : config.connections.radarrUrl
  const apiKey = application === 'sonarr' ? secrets.sonarrApiKey : secrets.radarrApiKey
  if (!baseUrl || !apiKey) return null
  return { application, baseUrl, apiKey }
}

export const GET = api(
  withAuthHandler(async (req: NextRequest) => {
    const parsedApplication = ApplicationSchema.safeParse(req.nextUrl.searchParams.get('application'))
    if (!parsedApplication.success) return jsonInvalidParameters('application must be sonarr or radarr')
    const stored = await loadAliasarrConfig()
    const application = parsedApplication.data
    const config = applicationConfig(application, stored.config, stored.secrets)
    const status = config ? { configured: true, ...(await createArrClient(config).status()) } : { configured: false, reachable: false, installed: false }
    return jsonSuccess({
      application,
      status,
      aliasarrUrlConfigured: Boolean(stored.config.connections.aliasarrUrl && stored.secrets.torznabApiKey),
    })
  })
)

export const POST = api(
  withAuthHandler(async (req: NextRequest) => {
    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return jsonInvalidParameters('Invalid JSON body')
    }
    const parsed = ActionSchema.safeParse(payload)
    if (!parsed.success) return jsonInvalidParameters(parsed.error.message)

    const stored = await loadAliasarrConfig()
    const config = applicationConfig(parsed.data.application, stored.config, stored.secrets)
    if (!config) {
      return jsonInvalidParameters(`Configure the ${parsed.data.application} URL and API key in Admin`)
    }

    try {
      const client = createArrClient(config)
      if (parsed.data.action === 'remove') return jsonSuccess(await client.remove())
      const aliasarrUrl = stored.config.connections.aliasarrUrl
      if (!aliasarrUrl) return jsonInvalidParameters('Configure the public Aliasarr URL before application sync')
      if (!stored.secrets.torznabApiKey) return jsonInvalidParameters('Configure the Torznab API key before application sync')
      return jsonSuccess(await client.sync({ baseUrl: aliasarrUrl, apiKey: stored.secrets.torznabApiKey }))
    } catch (error) {
      return standardResponseError(error instanceof Error ? error.message : 'Application sync failed', { code: 3001 }).toJsonResponse(502)
    }
  })
)
