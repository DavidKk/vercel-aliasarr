'use client'

import type { ApiEnvelope } from './types'

type BulkAction = 'sync' | 'remove'

export type ApplicationsBulkResponse = {
  summary?: string
  noop?: boolean
  installedCount?: number
  created?: number
  updated?: number
  removed?: number
  bulk?: {
    results?: Record<string, { status: string; reason?: string; message?: string }>
  }
}

export async function postApplicationsAction(application: 'sonarr' | 'radarr' | 'all', action: BulkAction): Promise<ApplicationsBulkResponse> {
  const response = await fetch('/api/config/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application, action }),
  })
  const json = (await response.json()) as ApiEnvelope<ApplicationsBulkResponse>
  if (!response.ok || json.code !== 0) {
    throw new Error(json.message || `Application ${action} failed`)
  }
  return json.data
}

export function formatSingleSyncMessage(application: 'sonarr' | 'radarr', data: ApplicationsBulkResponse): string {
  const label = application === 'sonarr' ? 'Sonarr' : 'Radarr'
  const installed = data.installedCount ?? (data.created ?? 0) + (data.updated ?? 0)
  return `${label} synchronized ${installed} Aliasarr indexer${installed === 1 ? '' : 's'}.`
}

export function formatSingleRemoveMessage(application: 'sonarr' | 'radarr', data: ApplicationsBulkResponse): string {
  const label = application === 'sonarr' ? 'Sonarr' : 'Radarr'
  const removed = data.removed ?? 0
  return `${label} removed ${removed} Aliasarr indexer${removed === 1 ? '' : 's'}.`
}
