'use client'

import { FiRefreshCw } from 'react-icons/fi'

import { Skeleton, Toggle, Tooltip } from '@/components/ui'

import { ConnectionTestButton } from './connection-test-button'
import type { ApplicationStatus } from './types'

export function ArrIndexerSyncRow({
  application,
  label,
  status,
  busyLabel,
  disabledReason,
  busy,
  onToggle,
}: {
  application: 'sonarr' | 'radarr'
  label: string
  status: ApplicationStatus | undefined
  busyLabel: boolean
  disabledReason: string | null
  busy: boolean
  onToggle(enabled: boolean): void
}) {
  const installedCount = status?.installedCount ?? 0
  const helperText =
    disabledReason ??
    (installedCount > 0
      ? `Synced ${installedCount} indexer${installedCount === 1 ? '' : 's'} in ${label}. Sync refreshes URL and API key; tags, categories, and priority stay in ${label}.`
      : `Not synced in ${label}. Sync creates one Torznab entry per selected upstream indexer.`)

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-app-border/70 pt-4">
      <Toggle
        checked={Boolean(status?.installed)}
        label={busyLabel ? 'Updating…' : 'Aliasarr indexers'}
        helperText={helperText}
        disabled={disabledReason != null || busy}
        onChange={onToggle}
      />
      <ConnectionTestButton service={application} label={`Test ${label}`} />
    </div>
  )
}

export function ApplicationStatusButton({
  application,
  status,
  refreshing,
  onRefresh,
}: {
  application: string
  status: ApplicationStatus | undefined
  refreshing: boolean
  onRefresh(): void
}) {
  const connected = Boolean(status?.configured && status.reachable)
  const label = status?.reachable ? 'Connected' : status?.configured ? 'Offline' : 'Unconfigured'
  return (
    <Tooltip content={`Refresh ${application} status`} placement="bottom">
      <button
        type="button"
        className={`group min-w-[6.5rem] shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold transition disabled:cursor-wait ${connected ? 'bg-app-successSoft text-app-success' : 'bg-app-dangerSoft text-app-danger'}`}
        aria-label={`Refresh ${application} status`}
        disabled={refreshing}
        onClick={onRefresh}
      >
        {refreshing ? (
          <Skeleton className="mx-auto h-4 w-16" rounded="full" />
        ) : (
          <>
            <span className="group-hover:hidden group-focus-visible:hidden">{label}</span>
            <span className="hidden items-center justify-center gap-1 group-hover:flex group-focus-visible:flex">
              <FiRefreshCw className="h-3 w-3" aria-hidden /> Refresh
            </span>
          </>
        )}
      </button>
    </Tooltip>
  )
}
