'use client'

import { useCallback, useEffect, useState } from 'react'

import { ApplicationStatusButton, ArrIndexerSyncRow } from '../_components/arr-indexer-sync-row'
import { useConfigForm } from '../_components/config-provider'
import { PageSaveBar } from '../_components/page-save-bar'
import type { ApiEnvelope, ApplicationStatus } from '../_components/types'
import { ConfigCard, ConfigPage, ConnectionInput, SecretInput } from '../_components/ui'

const applicationNames = ['sonarr', 'radarr'] as const
type ApplicationName = (typeof applicationNames)[number]

export default function ApplicationsConfigPage() {
  const { config, revision, secretStatus, secretUpdates, setError, setMessage, updateConnection, updateSecret } = useConfigForm()
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
          sonarr: current?.sonarr ?? { configured: false, reachable: false, installed: false },
          radarr: current?.radarr ?? { configured: false, reachable: false, installed: false },
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

  useEffect(() => {
    void Promise.all(applicationNames.map((application) => loadApplication(application)))
  }, [loadApplication, revision])

  if (!config) return null

  async function applicationAction(application: 'sonarr' | 'radarr', action: 'sync' | 'remove') {
    setBusyApplication(`${application}:${action}`)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/config/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application, action }) })
      const json = (await response.json()) as ApiEnvelope<{ created?: boolean; removed?: number }>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Application action failed')
      setMessage(`${application === 'sonarr' ? 'Sonarr' : 'Radarr'} Aliasarr indexer ${action === 'sync' ? 'synchronized' : 'removed'}.`)
      await loadApplication(application)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Application action failed')
    } finally {
      setBusyApplication(null)
    }
  }

  return (
    <ConfigPage
      eyebrow="Configuration / Sync"
      title="Applications"
      description="Connect Aliasarr to Sonarr and Radarr, then install or remove the managed indexer."
      footer={<PageSaveBar section="applications" />}
    >
      {applicationNames.map((application) => {
        const status = applications?.[application]
        const label = application === 'sonarr' ? 'Sonarr' : 'Radarr'
        const urlName = application === 'sonarr' ? 'sonarrUrl' : 'radarrUrl'
        const secretName = application === 'sonarr' ? 'sonarrApiKey' : 'radarrApiKey'
        const disabledReason = refreshing[application]
          ? 'Checking connection…'
          : !status?.configured
            ? `Save the ${label} URL and API key first`
            : !status.reachable
              ? `${label} must be connected before installing the indexer`
              : !status.installed && !aliasarrUrlConfigured
                ? 'Configure the Aliasarr URL and Server API key in Services first'
                : null
        return (
          <ConfigCard
            key={application}
            title={label}
            detail={
              !status?.configured
                ? 'URL or API key missing'
                : !status.reachable
                  ? 'API unreachable'
                  : status.installed
                    ? `Aliasarr installed${status.id ? ` · #${status.id}` : ''}`
                    : 'Ready to install'
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
