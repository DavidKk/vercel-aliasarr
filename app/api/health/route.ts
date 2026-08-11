import { api } from '@/initializer/controller'
import { getHealthPayload } from '@/services/app/health'

export const runtime = 'nodejs'
export const maxDuration = 10

/** GET /api/health — public liveness / Prowlarr reachability probe. */
export const GET = api(async () => getHealthPayload())
