import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonUnauthorized } from '@/initializer/response'
import { extractApiKey } from '@/initializer/wrapper'
import { getAppRuntime } from '@/services/app/runtime'
import { validateCookie } from '@/services/auth/access'
import { runDebugSearch } from '@/services/search/debug-search'
import { assertTorznabApiKey, UnauthorizedError } from '@/services/security/api-key'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  tvdbId: z.number().int().positive().optional(),
  tmdbId: z.number().int().positive().optional(),
  imdbId: z.string().optional(),
  season: z.number().int().nonnegative().optional(),
  episode: z.number().int().nonnegative().optional(),
  year: z.number().int().positive().optional(),
  q: z.string().optional(),
  mediaType: z.enum(['series', 'movie']).optional(),
  apikey: z.string().min(1).optional(),
})

export const POST = api(async (req: NextRequest) => {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return jsonInvalidParameters('Invalid JSON body')
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return jsonInvalidParameters(parsed.error.message)
  }

  const body = parsed.data
  const hasAdminSession = await validateCookie()
  if (!hasAdminSession) {
    const providedKey = body.apikey ?? extractApiKey(req)
    if (!providedKey) return jsonUnauthorized()
  }

  const app = await getAppRuntime()
  if (!hasAdminSession) {
    try {
      assertTorznabApiKey(body.apikey ?? extractApiKey(req), app.secrets.torznabApiKey)
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return jsonUnauthorized()
      }
      throw error
    }
  }

  if (body.tvdbId == null && body.tmdbId == null && !body.imdbId && !body.q) {
    return jsonInvalidParameters('Provide tvdbId, tmdbId, imdbId, or q')
  }

  return runDebugSearch(app, body)
})
