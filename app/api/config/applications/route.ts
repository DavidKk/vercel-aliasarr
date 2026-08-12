import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { runArrApplicationAction, summarizeArrBulkAction } from '@/services/arr/applications-actions'
import { createArrClient } from '@/services/arr/client'
import { applicationConnectionConfig } from '@/services/arr/sync-targets'
import { loadAliasarrConfig } from '@/services/config'

export const runtime = 'nodejs'
export const maxDuration = 300

const ActionSchema = z.object({
  application: z.enum(['sonarr', 'radarr', 'all']),
  action: z.enum(['sync', 'remove']),
})
const ApplicationSchema = z.enum(['sonarr', 'radarr'])

export const GET = api(
  withAuthHandler(async (req: NextRequest) => {
    const parsedApplication = ApplicationSchema.safeParse(req.nextUrl.searchParams.get('application'))
    if (!parsedApplication.success) return jsonInvalidParameters('application must be sonarr or radarr')
    const stored = await loadAliasarrConfig()
    const application = parsedApplication.data
    const config = applicationConnectionConfig(application, stored.config, stored.secrets)
    const status = config ? { configured: true, ...(await createArrClient(config).status()) } : { configured: false, reachable: false, installed: false, installedCount: 0 }
    return jsonSuccess({
      application,
      status,
      aliasarrUrlConfigured: Boolean(stored.config.connections.aliasarrUrl && stored.secrets.torznabApiKey),
    })
  })
)

export const POST = api(
  withAuthHandler(async (req: NextRequest) => {
    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return jsonInvalidParameters('Invalid JSON body')
    }
    const parsed = ActionSchema.safeParse(payload)
    if (!parsed.success) return jsonInvalidParameters(parsed.error.message)

    try {
      const result = await runArrApplicationAction(parsed.data.application, parsed.data.action)
      const summary = summarizeArrBulkAction(result)

      if (parsed.data.application !== 'all') {
        const single = result.results[parsed.data.application]
        if (!single || single.status === 'error') {
          return standardResponseError(single?.status === 'error' ? single.message : summary.hardError || 'Application action failed', {
            code: 3001,
          }).toJsonResponse(502)
        }
        if (single.status === 'skipped') {
          return jsonInvalidParameters(single.reason)
        }
        return jsonSuccess({ ...single.result, bulk: result })
      }

      if (!summary.ok && summary.hardError && Object.values(result.results).every((entry) => entry?.status === 'error')) {
        return standardResponseError(summary.hardError, { code: 3001 }).toJsonResponse(502)
      }

      return jsonSuccess({ ...result, summary: summary.message, noop: summary.noop })
    } catch (error) {
      return standardResponseError(error instanceof Error ? error.message : 'Application sync failed', { code: 3001 }).toJsonResponse(502)
    }
  })
)
