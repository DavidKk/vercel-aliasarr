'use client'

import { Skeleton, Toggle } from '@/components/ui'

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
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-app-border/70 pt-4">
      <Toggle
        checked={Boolean(status?.installed)}
        label={busyLabel ? 'Updating…' : 'Aliasarr indexer'}
        helperText={disabledReason ?? (status?.installed ? `Installed in ${label}` : `Not installed in ${label}`)}
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
    <button
      type="button"
      className={`group min-w-[6.5rem] shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold transition disabled:cursor-wait ${connected ? 'bg-app-successSoft text-app-success' : 'bg-app-dangerSoft text-app-danger'}`}
      aria-label={`Refresh ${application} status`}
      title={`Refresh ${application} status`}
      disabled={refreshing}
      onClick={onRefresh}
    >
      {refreshing ? (
        <Skeleton className="mx-auto h-4 w-16" rounded="full" />
      ) : (
        <>
          <span className="group-hover:hidden group-focus-visible:hidden">{label}</span>
          <span className="hidden items-center justify-center gap-1 group-hover:flex group-focus-visible:flex">
            <RefreshIcon /> Refresh
          </span>
        </>
      )}
    </button>
  )
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3 w-3 fill-none stroke-current" strokeWidth="1.8">
      <path d="M16 6V2.5M16 2.5h-3.5M16 2.5A7 7 0 1 0 17 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
