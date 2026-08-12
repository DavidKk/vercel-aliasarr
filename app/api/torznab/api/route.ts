import { serveTorznabRequest } from '@/services/torznab/handler'

export const runtime = 'nodejs'
export const maxDuration = 30

/** Torznab URL + the `/api` suffix appended by Sonarr/Radarr. */
export async function GET(request: Request): Promise<Response> {
  return serveTorznabRequest(request)
}
