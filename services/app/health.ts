import { getEnv } from '@/utils/env'
import { createProwlarrClient } from '@/services/prowlarr/client'

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
    const client = createProwlarrClient({
      baseUrl: env.PROWLARR_URL,
      apiKey: env.PROWLARR_API_KEY,
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
