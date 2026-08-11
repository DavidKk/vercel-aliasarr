import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { loadAliasarrConfig } from '@/services/config'
import { fetchGist, listAliasGistPaths } from '@/services/gist'

export const runtime = 'nodejs'

/** GET /api/aliases — list Gist YAML paths (login required). */
export const GET = api(
  withAuthHandler(async () => {
    const stored = await loadAliasarrConfig()
    const gistId = stored.config.connections.gistId
    const gistToken = stored.secrets.gistToken
    if (!gistId || !gistToken) return jsonSuccess({ files: [], configured: false })
    const creds = { gistId, gistToken }
    const gist = await fetchGist(creds)
    const files = listAliasGistPaths(gist.files)
    return jsonSuccess({ files, configured: true })
  })
)
