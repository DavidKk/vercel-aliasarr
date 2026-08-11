import { z } from 'zod'

import { type Tool, tool } from '@/initializer/mcp/tool'
import { getHealthPayload } from '@/services/app/health'
import { getAppRuntime } from '@/services/app/runtime'
import { runDebugSearch } from '@/services/search/debug-search'

export function buildAliasarrMcpToolsMap(): Map<string, Tool> {
  const health = tool('aliasarr_health', 'Return Aliasarr health status including Prowlarr reachability.', z.object({}), async () => getHealthPayload())

  const resolveTitles = tool(
    'aliasarr_resolve_titles',
    'Resolve Chinese alias titles from TMDB/Bangumi/Gist for a series or movie (no Prowlarr call).',
    z.object({
      mediaType: z.enum(['series', 'movie']).optional().describe('Default series when tvdbId set, else movie when tmdb/imdb'),
      tvdbId: z.number().int().positive().optional(),
      tmdbId: z.number().int().positive().optional(),
      imdbId: z.string().optional(),
      q: z.string().optional(),
      season: z.number().int().nonnegative().optional(),
      episode: z.number().int().nonnegative().optional(),
      year: z.number().int().positive().optional(),
    }),
    async (input) => {
      const app = await getAppRuntime()
      const mediaType = input.mediaType ?? (input.tvdbId != null ? 'series' : 'movie')
      const { titles, media, sources } = await app.resolveForRequest({
        type: mediaType === 'movie' ? 'movie' : 'tvsearch',
        q: input.q,
        season: input.season,
        ep: input.episode,
        year: input.year,
        tvdbId: input.tvdbId,
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
        categories: mediaType === 'movie' ? [2000] : [5000],
        limit: app.env.SEARCH_RESULT_LIMIT,
        offset: 0,
      })
      return {
        mediaType,
        sources,
        primaryTitle: media?.primaryTitle ?? input.q ?? null,
        aliases: media?.aliases.map((a) => a.title) ?? [],
        titles,
        originalLanguage: media?.originalLanguage,
      }
    }
  )

  const debugSearch = tool(
    'aliasarr_debug_search',
    'Expand aliases, query Prowlarr, dedupe, and return a debug search summary.',
    z.object({
      mediaType: z.enum(['series', 'movie']).optional(),
      tvdbId: z.number().int().positive().optional(),
      tmdbId: z.number().int().positive().optional(),
      imdbId: z.string().optional(),
      season: z.number().int().nonnegative().optional(),
      episode: z.number().int().nonnegative().optional(),
      year: z.number().int().positive().optional(),
      q: z.string().optional(),
    }),
    async (input) => {
      const app = await getAppRuntime()
      return runDebugSearch(app, input)
    }
  )

  const summary = tool('aliasarr_tooling_summary', 'List Aliasarr MCP tools and auth requirements.', z.object({}), async () => ({
    endpoint: '/api/mcp',
    auth: 'Admin-configured Torznab API key via x-api-key, Authorization: Bearer, or ?apikey=',
    tools: ['aliasarr_health', 'aliasarr_resolve_titles', 'aliasarr_debug_search', 'aliasarr_tooling_summary'],
    note: 'YAML Gist edits require web login; MCP does not expose write tools.',
  }))

  return new Map([
    [health.name, health],
    [resolveTitles.name, resolveTitles],
    [debugSearch.name, debugSearch],
    [summary.name, summary],
  ])
}
