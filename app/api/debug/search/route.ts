import { z } from 'zod'
import { getAppRuntime } from '@/services/app/runtime'
import { runDebugSearch } from '@/services/search/debug-search'
import { assertTorznabApiKey, UnauthorizedError } from '@/services/security/api-key'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  tvdbId: z.number().int().positive(),
  season: z.number().int().nonnegative().optional(),
  episode: z.number().int().nonnegative().optional(),
  q: z.string().optional(),
  apikey: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const json = await request.json()
    const body = BodySchema.parse(json)
    assertTorznabApiKey(body.apikey)

    const app = await getAppRuntime()
    const result = await runDebugSearch(app, {
      tvdbId: body.tvdbId,
      season: body.season,
      episode: body.episode,
      q: body.q,
    })

    return Response.json(result)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: err.flatten() }, { status: 400 })
    }
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
