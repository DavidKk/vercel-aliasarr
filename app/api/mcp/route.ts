import type { NextRequest } from 'next/server'

import { jsonUnauthorized } from '@/initializer/response'
import { extractApiKey } from '@/initializer/wrapper'
import { loadAliasarrConfig } from '@/services/config'
import { assertTorznabApiKey, UnauthorizedError } from '@/services/security/api-key'

import { execute, manifest } from './aliasarrMcpServer'

export const runtime = 'nodejs'
export const maxDuration = 30

async function authorize(req: NextRequest): Promise<Response | null> {
  try {
    const stored = await loadAliasarrConfig()
    assertTorznabApiKey(extractApiKey(req), stored.secrets.torznabApiKey)
    return null
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonUnauthorized()
    }
    throw error
  }
}

/**
 * GET /api/mcp — MCP manifest (tools schema). Requires the Admin-configured Torznab key.
 */
export async function GET(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const denied = await authorize(req)
  if (denied) return denied
  return manifest(req, context)
}

/**
 * POST /api/mcp — JSON-RPC 2.0 or legacy `{ tool, params }`. Requires the Admin-configured Torznab key.
 */
export async function POST(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const denied = await authorize(req)
  if (denied) return denied
  return execute(req, context)
}
