import { loadAliasarrConfig } from '@/services/config'
import { createProwlarrClient } from '@/services/prowlarr/client'
import { getEnv } from '@/utils/env'

export interface HealthPayload {
  status: 'ok'
  prowlarr: 'reachable' | 'unreachable' | 'unconfigured'
  database: 'skipped'
  version: '0.1.0'
  runtime: 'vercel'
}

export async function getHealthPayload(): Promise<HealthPayload> {
  let prowlarr: HealthPayload['prowlarr'] = 'unconfigured'
  try {
    const env = getEnv()
    const stored = await loadAliasarrConfig()
    const prowlarrUrl = stored.config.connections.prowlarrUrl
    if (!prowlarrUrl || !stored.secrets.prowlarrApiKey) throw new Error('Prowlarr is not configured')
    const client = createProwlarrClient({
      baseUrl: prowlarrUrl,
      apiKey: stored.secrets.prowlarrApiKey,
      timeoutMs: Math.min(env.PROWLARR_TIMEOUT_MS, 3000),
    })
    prowlarr = (await client.ping()) ? 'reachable' : 'unreachable'
  } catch {
    prowlarr = 'unconfigured'
  }

  return {
    status: 'ok',
    prowlarr,
    database: 'skipped',
    version: '0.1.0',
    runtime: 'vercel',
  }
}
