import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { loadAliasarrConfig } from '@/services/config'
import { createJackettClient } from '@/services/jackett'
import { createProwlarrClient } from '@/services/prowlarr/client'
import { getEnv } from '@/utils/env'

export const runtime = 'nodejs'

export const GET = api(
  withAuthHandler(async () => {
    const env = getEnv()
    const stored = await loadAliasarrConfig()
    const prowlarrUrl = stored.config.connections.prowlarrUrl
    const jackettUrl = stored.config.connections.jackettUrl
    const prowlarr =
      prowlarrUrl && stored.secrets.prowlarrApiKey
        ? createProwlarrClient({
            baseUrl: prowlarrUrl,
            apiKey: stored.secrets.prowlarrApiKey,
            timeoutMs: env.PROWLARR_TIMEOUT_MS,
          })
        : null
    const jackett =
      jackettUrl && stored.secrets.jackettApiKey ? createJackettClient({ baseUrl: jackettUrl, apiKey: stored.secrets.jackettApiKey, timeoutMs: env.JACKETT_TIMEOUT_MS }) : null

    const [prowlarrResult, jackettResult] = await Promise.allSettled([prowlarr?.listIndexers() ?? Promise.resolve([]), jackett?.listIndexers() ?? Promise.resolve([])])

    return jsonSuccess({
      prowlarr: {
        configured: prowlarr != null,
        error: prowlarrResult.status === 'rejected' ? (prowlarrResult.reason instanceof Error ? prowlarrResult.reason.message : 'Unavailable') : null,
        indexers: prowlarrResult.status === 'fulfilled' ? prowlarrResult.value : [],
      },
      jackett: {
        configured: jackett != null,
        error: jackettResult.status === 'rejected' ? (jackettResult.reason instanceof Error ? jackettResult.reason.message : 'Unavailable') : null,
        indexers: jackettResult.status === 'fulfilled' ? jackettResult.value : [],
      },
    })
  })
)
