import type { NextRequest } from 'next/server'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { getAppRuntime } from '@/services/app/runtime'
import { loadAliasarrConfig } from '@/services/config'
import { fetchGist, getGistRevision, GistRevisionConflictError, mutateGistFile, readGistFile } from '@/services/gist'
import { MediaFileSchema, parseMediaYaml } from '@/services/media/media-schema'
import { aliasCacheKey } from '@/services/media/providers/types'

export const runtime = 'nodejs'

async function requireGistConfig(): Promise<{ gistId: string; gistToken: string }> {
  const stored = await loadAliasarrConfig()
  const gistId = stored.config.connections.gistId
  const gistToken = stored.secrets.gistToken
  if (!gistId || !gistToken) throw new Error('Gist is not configured')
  return { gistId, gistToken }
}

function assertSafeAliasPath(pathParts: string[]): string {
  const path = pathParts.join('/')
  if (!/^(?:series|movies)(?:-|\/)(?:tvdb|tmdb|imdb)-[\w.-]+\.ya?ml$/i.test(path) || path.includes('..')) {
    throw new Error('Filename must match series-tvdb-*.yaml or movies-tmdb-*.yaml')
  }
  return path
}

/** GET /api/aliases/[...path] */
export const GET = api(
  withAuthHandler(async (_req, context) => {
    const parts = (await context.params).path as string[]
    let fileName: string
    try {
      fileName = assertSafeAliasPath(parts)
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Invalid path')
    }

    let creds
    try {
      creds = await requireGistConfig()
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Gist not configured')
    }

    try {
      const gist = await fetchGist(creds, { forceFresh: true })
      const content = await readGistFile({ ...creds, fileName }, { gist })
      return jsonSuccess({ path: fileName, content, revision: getGistRevision(gist) })
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Read failed')
    }
  })
)

/** PUT /api/aliases/[...path] — body: { content: string, revision: string } */
export const PUT = api(
  withAuthHandler(async (req: NextRequest, context) => {
    const parts = (await context.params).path as string[]
    let fileName: string
    try {
      fileName = assertSafeAliasPath(parts)
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Invalid path')
    }

    let creds
    try {
      creds = await requireGistConfig()
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Gist not configured')
    }

    let body: { content?: string; revision?: string | null }
    try {
      body = await req.json()
    } catch {
      return jsonInvalidParameters('Invalid JSON body')
    }
    if (typeof body.content !== 'string') {
      return jsonInvalidParameters('content must be a string')
    }
    if (typeof body.revision !== 'string') {
      return standardResponseError('revision is required; reopen the file before saving', { code: 1001 }).toJsonResponse(428)
    }

    let parsedYaml: unknown
    try {
      parsedYaml = parseYaml(body.content)
    } catch {
      return jsonInvalidParameters('Invalid YAML')
    }

    const validated = MediaFileSchema.safeParse(parsedYaml)
    if (!validated.success) {
      return jsonInvalidParameters(validated.error.message)
    }

    const media = parseMediaYaml(validated.data)
    if (!media) {
      return jsonInvalidParameters('Unable to parse media document')
    }

    // normalize stored content
    const normalized = stringifyYaml(validated.data)

    try {
      const result = await mutateGistFile({
        ...creds,
        fileName,
        content: normalized,
        expectedRevision: body.revision,
      })

      const app = await getAppRuntime()
      await app.cache.delete(
        aliasCacheKey({
          mediaType: media.mediaType,
          tvdbId: media.tvdbId,
          tmdbId: media.tmdbId,
          imdbId: media.imdbId,
        })
      )

      return jsonSuccess({ path: fileName, ok: true, revision: result.revision })
    } catch (err) {
      if (err instanceof GistRevisionConflictError) {
        return standardResponseError('This Gist changed after you opened it. Reopen the file and apply your edit again.', {
          code: 1002,
          data: { expectedRevision: err.expectedRevision, actualRevision: err.actualRevision },
        }).toJsonResponse(409)
      }
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Write failed')
    }
  })
)

/** DELETE /api/aliases/[...path] */
export const DELETE = api(
  withAuthHandler(async (req, context) => {
    const parts = (await context.params).path as string[]
    let fileName: string
    try {
      fileName = assertSafeAliasPath(parts)
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Invalid path')
    }

    let creds
    try {
      creds = await requireGistConfig()
    } catch (err) {
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Gist not configured')
    }

    const revision = req.headers.get('x-gist-revision')
    if (!revision) {
      return standardResponseError('x-gist-revision is required; reopen the file before deleting', { code: 1001 }).toJsonResponse(428)
    }

    try {
      const result = await mutateGistFile({ ...creds, fileName, content: null, expectedRevision: revision })
      return jsonSuccess({ path: fileName, deleted: true, revision: result.revision })
    } catch (err) {
      if (err instanceof GistRevisionConflictError) {
        return standardResponseError('This Gist changed after you opened it. Reopen the file before deleting.', {
          code: 1002,
          data: { expectedRevision: err.expectedRevision, actualRevision: err.actualRevision },
        }).toJsonResponse(409)
      }
      return jsonInvalidParameters(err instanceof Error ? err.message : 'Delete failed')
    }
  })
)
