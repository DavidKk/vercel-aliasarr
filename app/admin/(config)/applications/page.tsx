'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui'

import { formatSingleRemoveMessage, formatSingleSyncMessage, postApplicationsAction } from '../_components/applications-actions'
import { ApplicationStatusButton, ArrIndexerSyncRow } from '../_components/arr-indexer-sync-row'
import { useConfigForm } from '../_components/config-provider'
import { CustomHeadersEditor } from '../_components/custom-headers-editor'
import { PageSaveBar } from '../_components/page-save-bar'
import type { ApiEnvelope, ApplicationStatus } from '../_components/types'
import { ConfigCard, ConfigPage, ConnectionInput, SecretInput } from '../_components/ui'

const applicationNames = ['sonarr', 'radarr'] as const
type ApplicationName = (typeof applicationNames)[number]

export default function ApplicationsConfigPage() {
  const { config, customHeaders, revision, secretStatus, secretUpdates, setError, setMessage, updateConnection, updateCustomHeaders, updateSecret } = useConfigForm()
  const [applications, setApplications] = useState<Record<'sonarr' | 'radarr', ApplicationStatus> | null>(null)
  const [aliasarrUrlConfigured, setAliasarrUrlConfigured] = useState(false)
  const [refreshing, setRefreshing] = useState<Record<ApplicationName, boolean>>({ sonarr: true, radarr: true })
  const [busyApplication, setBusyApplication] = useState<string | null>(null)

  const loadApplication = useCallback(
    async (application: ApplicationName) => {
      setRefreshing((current) => ({ ...current, [application]: true }))
      try {
        const response = await fetch(`/api/config/applications?application=${application}`)
        const json = (await response.json()) as ApiEnvelope<{ application: ApplicationName; status: ApplicationStatus; aliasarrUrlConfigured: boolean }>
        if (!response.ok || json.code !== 0) throw new Error(json.message || 'Application status failed')
        setApplications((current) => ({
          sonarr: current?.sonarr ?? { configured: false, reachable: false, installed: false, installedCount: 0 },
          radarr: current?.radarr ?? { configured: false, reachable: false, installed: false, installedCount: 0 },
          [application]: json.data.status,
        }))
        setAliasarrUrlConfigured(json.data.aliasarrUrlConfigured)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Application status failed')
      } finally {
        setRefreshing((current) => ({ ...current, [application]: false }))
      }
    },
    [setError]
  )

  const refreshAll = useCallback(async () => {
    await Promise.all(applicationNames.map((application) => loadApplication(application)))
  }, [loadApplication])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll, revision])

  if (!config) return null

  async function applicationAction(application: 'sonarr' | 'radarr', action: 'sync' | 'remove') {
    setBusyApplication(`${application}:${action}`)
    setError(null)
    setMessage(null)
    try {
      const data = await postApplicationsAction(application, action)
      setMessage(action === 'sync' ? formatSingleSyncMessage(application, data) : formatSingleRemoveMessage(application, data))
      await loadApplication(application)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Application action failed')
    } finally {
      setBusyApplication(null)
    }
  }

  async function bulkAction(action: 'sync' | 'remove') {
    setBusyApplication(`all:${action}`)
    setError(null)
    setMessage(null)
    try {
      const data = await postApplicationsAction('all', action)
      setMessage(data.summary ?? (action === 'sync' ? 'Synced Aliasarr indexers to Sonarr and Radarr.' : 'Removed Aliasarr indexers from Sonarr and Radarr.'))
      await refreshAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Application action failed')
      await refreshAll()
    } finally {
      setBusyApplication(null)
    }
  }

  const bulkBusy = busyApplication != null
  const anyConfigured = Boolean(applications?.sonarr?.configured || applications?.radarr?.configured)
  const bulkDisabledReason = !aliasarrUrlConfigured ? 'Generate the Server API key in Services first' : !anyConfigured ? 'Save a Sonarr or Radarr URL and API key first' : null

  return (
    <ConfigPage
      eyebrow="Configuration / Sync"
      title="Applications"
      description="Connect Aliasarr to Sonarr and Radarr, then sync one Torznab entry per selected upstream indexer. Saving Services, Indexers, or Applications config auto-resyncs both apps."
      footer={<PageSaveBar section="applications" />}
    >
      <ConfigCard title="Bulk sync" detail="Push or clear managed Aliasarr indexers on both applications">
        <p className="text-sm text-app-muted">
          Sync creates or updates entries named like <span className="font-medium text-app-text">1337x (Aliasarr · Prowlarr)</span> from the current Indexers selection. Remove
          deletes every managed Aliasarr indexer, including the legacy bare name. Sync refreshes URL and API key only — tags, categories, and priority stay as configured in
          Sonarr/Radarr.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" disabled={bulkBusy || bulkDisabledReason != null} onClick={() => void bulkAction('sync')}>
            {busyApplication === 'all:sync' ? 'Syncing…' : 'Sync all to Sonarr & Radarr'}
          </Button>
          <Button size="sm" variant="danger" disabled={bulkBusy || !anyConfigured} onClick={() => void bulkAction('remove')}>
            {busyApplication === 'all:remove' ? 'Removing…' : 'Remove all Aliasarr indexers'}
          </Button>
        </div>
        {bulkDisabledReason ? <p className="mt-3 text-xs text-app-muted">{bulkDisabledReason}</p> : null}
      </ConfigCard>

      {applicationNames.map((application) => {
        const status = applications?.[application]
        const label = application === 'sonarr' ? 'Sonarr' : 'Radarr'
        const urlName = application === 'sonarr' ? 'sonarrUrl' : 'radarrUrl'
        const secretName = application === 'sonarr' ? 'sonarrApiKey' : 'radarrApiKey'
        const headersName = application === 'sonarr' ? 'sonarrHeaders' : 'radarrHeaders'
        const disabledReason = refreshing[application]
          ? 'Checking connection…'
          : !status?.configured
            ? `Save the ${label} URL and API key first`
            : !status.reachable
              ? `${label} must be connected before syncing indexers`
              : !status.installed && !aliasarrUrlConfigured
                ? 'Generate the Server API key in Services first'
                : null
        const installedCount = status?.installedCount ?? 0
        return (
          <ConfigCard
            key={application}
            title={label}
            detail={
              !status?.configured
                ? 'URL or API key missing'
                : !status.reachable
                  ? 'API unreachable'
                  : installedCount > 0
                    ? `Synced · ${installedCount} indexer${installedCount === 1 ? '' : 's'}`
                    : 'Ready to sync'
            }
            status={<ApplicationStatusButton application={label} status={status} refreshing={refreshing[application]} onRefresh={() => void loadApplication(application)} />}
          >
            <div className="grid items-start gap-4 md:grid-cols-2">
              <ConnectionInput
                label="Server URL"
                placeholder={application === 'sonarr' ? 'http://sonarr:8989' : 'http://radarr:7878'}
                value={config.connections[urlName]}
                onChange={(value) => updateConnection(urlName, value)}
              />
              <SecretInput
                label="API key"
                configured={Boolean(secretStatus?.[secretName])}
                value={secretUpdates[secretName] ?? ''}
                onChange={(value) => updateSecret(secretName, value)}
              />
              <CustomHeadersEditor
                value={customHeaders[headersName]}
                onChange={(rows) => updateCustomHeaders(headersName, rows)}
                description="Sent with every request to this host. For Cloudflare Access use CF-Access-Client-Id and CF-Access-Client-Secret (Service Token). Do not reuse X-Api-Key here — that is reserved for the Sonarr/Radarr API key field."
              />
            </div>
            <ArrIndexerSyncRow
              application={application}
              label={label}
              status={status}
              busyLabel={Boolean(busyApplication?.startsWith(`${application}:`))}
              disabledReason={disabledReason}
              busy={busyApplication != null}
              onToggle={(enabled) => void applicationAction(application, enabled ? 'sync' : 'remove')}
            />
          </ConfigCard>
        )
      })}
    </ConfigPage>
  )
}
