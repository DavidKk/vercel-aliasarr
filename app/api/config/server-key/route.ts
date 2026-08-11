import { randomBytes } from 'node:crypto'

import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { getAppRuntime, resetAppRuntime } from '@/services/app/runtime'
import { ConfigRevisionConflictError, loadAliasarrConfig, saveAliasarrConfig } from '@/services/config'

export const runtime = 'nodejs'

const GenerateRequestSchema = z.object({ revision: z.string().nullable() })

function noStoreHeaders(): Headers {
  return new Headers({ 'Cache-Control': 'no-store, max-age=0' })
}

export const GET = api(
  withAuthHandler(async () => {
    const stored = await loadAliasarrConfig()
    if (!stored.secrets.torznabApiKey) return jsonInvalidParameters('Server API key has not been generated')
    return jsonSuccess({ apiKey: stored.secrets.torznabApiKey }, { headers: noStoreHeaders() })
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
    const parsed = GenerateRequestSchema.safeParse(payload)
    if (!parsed.success) return jsonInvalidParameters(parsed.error.message)

    try {
      const stored = await loadAliasarrConfig()
      const apiKey = randomBytes(32).toString('base64url')
      const saved = await saveAliasarrConfig(stored.config, { ...stored.secrets, torznabApiKey: apiKey }, parsed.data.revision)
      const appRuntime = await getAppRuntime()
      await appRuntime.cache.clear?.()
      resetAppRuntime()
      return jsonSuccess({ apiKey, revision: saved.revision }, { headers: noStoreHeaders() })
    } catch (error) {
      if (error instanceof ConfigRevisionConflictError) {
        return standardResponseError('Configuration changed remotely. Reload before generating a new key.', {
          code: 1002,
          data: { expectedRevision: error.expectedRevision, actualRevision: error.actualRevision },
        }).toJsonResponse(409, { headers: noStoreHeaders() })
      }
      return jsonInvalidParameters(error instanceof Error ? error.message : 'Server API key generation failed')
    }
  })
)
