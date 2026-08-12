import { type ArrApplication, type ArrSyncResult, createArrClient } from '@/services/arr/client'
import { applicationConnectionConfig, loadAliasarrIndexerTargetsForSync } from '@/services/arr/sync-targets'
import { loadAliasarrConfig } from '@/services/config'

export type ArrBulkApplication = ArrApplication | 'all'

export type ArrAppActionResult = { status: 'ok'; result: ArrSyncResult | { removed: number } } | { status: 'skipped'; reason: string } | { status: 'error'; message: string }

export type ArrBulkActionResult = {
  application: ArrBulkApplication
  action: 'sync' | 'remove'
  results: Partial<Record<ArrApplication, ArrAppActionResult>>
}

const APPS: ArrApplication[] = ['sonarr', 'radarr']

function appsFor(application: ArrBulkApplication): ArrApplication[] {
  return application === 'all' ? APPS : [application]
}

export async function runArrApplicationAction(application: ArrBulkApplication, action: 'sync' | 'remove'): Promise<ArrBulkActionResult> {
  const stored = await loadAliasarrConfig()
  let targets: Awaited<ReturnType<typeof loadAliasarrIndexerTargetsForSync>>['targets'] | null = null
  let failedProviders: Awaited<ReturnType<typeof loadAliasarrIndexerTargetsForSync>>['failedProviders'] = []
  let targetsError: string | null = null

  if (action === 'sync') {
    if (!stored.config.connections.aliasarrUrl || !stored.secrets.torznabApiKey) {
      targetsError = 'Aliasarr Torznab URL or API key is missing'
    } else {
      try {
        // Empty array is intentional (deselect all) and must prune managed entries via sync([]).
        const loaded = await loadAliasarrIndexerTargetsForSync()
        targets = loaded.targets
        failedProviders = loaded.failedProviders
      } catch (error) {
        targetsError = error instanceof Error ? error.message : 'Failed to build Aliasarr indexer targets'
      }
    }
  }

  const results: Partial<Record<ArrApplication, ArrAppActionResult>> = {}

  await Promise.all(
    appsFor(application).map(async (app) => {
      const config = applicationConnectionConfig(app, stored.config, stored.secrets)
      if (!config) {
        results[app] = { status: 'skipped', reason: `${app} is not configured` }
        return
      }

      try {
        const client = createArrClient(config)
        if (action === 'remove') {
          results[app] = { status: 'ok', result: await client.remove() }
          return
        }

        if (targetsError || targets == null) {
          results[app] = { status: 'skipped', reason: targetsError ?? 'No indexer targets available' }
          return
        }

        results[app] = { status: 'ok', result: await client.sync(targets, { retainProviders: failedProviders }) }
      } catch (error) {
        results[app] = {
          status: 'error',
          message: error instanceof Error ? error.message : `${app} ${action} failed`,
        }
      }
    })
  )

  return { application, action, results }
}

export function summarizeArrBulkAction(result: ArrBulkActionResult): {
  ok: boolean
  noop: boolean
  message: string
  hardError: string | null
} {
  const parts: string[] = []
  let okCount = 0
  let errorCount = 0
  let skipCount = 0
  const errors: string[] = []

  for (const app of APPS) {
    const entry = result.results[app]
    if (!entry) continue
    const label = app === 'sonarr' ? 'Sonarr' : 'Radarr'
    if (entry.status === 'ok') {
      okCount += 1
      if (result.action === 'sync') {
        const sync = entry.result as ArrSyncResult
        parts.push(`${label}: ${sync.installedCount} indexer${sync.installedCount === 1 ? '' : 's'}`)
      } else {
        const removed = (entry.result as { removed: number }).removed
        parts.push(`${label}: removed ${removed}`)
      }
    } else if (entry.status === 'skipped') {
      skipCount += 1
      parts.push(`${label}: skipped (${entry.reason})`)
    } else {
      errorCount += 1
      errors.push(`${label}: ${entry.message}`)
      parts.push(`${label}: failed`)
    }
  }

  if (okCount === 0 && errorCount > 0) {
    return { ok: false, noop: false, message: parts.join(' · '), hardError: errors.join(' · ') }
  }
  if (okCount === 0 && skipCount > 0 && errorCount === 0) {
    return { ok: true, noop: true, message: parts.join(' · '), hardError: null }
  }

  const verb = result.action === 'sync' ? 'Synced' : 'Removed'
  return {
    ok: errorCount === 0,
    noop: false,
    message: `${verb} Aliasarr indexers — ${parts.join(' · ')}`,
    hardError: errors.length ? errors.join(' · ') : null,
  }
}
