import { serveTorznabRequest } from '@/services/torznab/handler'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Standard Torznab/Newznab API path used by Sonarr and Radarr. */
export async function GET(request: Request): Promise<Response> {
  return serveTorznabRequest(request)
}
