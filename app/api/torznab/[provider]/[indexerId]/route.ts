import { parseTorznabIndexerScope, serveTorznabRequest } from '@/services/torznab/handler'
import { buildErrorXml } from '@/services/torznab/xml-builder'

export const runtime = 'nodejs'
export const maxDuration = 30

const XML_HEADERS = { 'Content-Type': 'application/rss+xml; charset=utf-8' }

type RouteContext = { params: Promise<{ provider: string; indexerId: string }> }

/** Scoped Torznab entry: /api/torznab/{provider}/{indexerId} */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { provider, indexerId } = await context.params
  const scope = parseTorznabIndexerScope(provider, indexerId)
  if (!scope) {
    return new Response(buildErrorXml(200, 'Invalid indexer scope'), { status: 400, headers: XML_HEADERS })
  }
  return serveTorznabRequest(request, undefined, scope)
}
