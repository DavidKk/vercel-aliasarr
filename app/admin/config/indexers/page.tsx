'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { Skeleton, Switch } from '@/components/ui'

import { useConfigForm } from '../_components/config-provider'
import { ConnectionTestButton } from '../_components/connection-test-button'
import { PageSaveBar } from '../_components/page-save-bar'
import type { ApiEnvelope, JackettIndexer, ProwlarrIndexer } from '../_components/types'
import { ConfigCard, ConfigPage, ConnectionInput, SecretInput } from '../_components/ui'

const modeOptions = [
  { label: 'All enabled', value: 'all' },
  { label: 'Selected only', value: 'selected' },
]

export default function IndexersConfigPage() {
  const { config, revision, secretStatus, secretUpdates, setError, updateConfig, updateConnection, updateSecret } = useConfigForm()
  const [prowlarrConfigured, setProwlarrConfigured] = useState(false)
  const [prowlarrIndexers, setProwlarrIndexers] = useState<ProwlarrIndexer[]>([])
  const [prowlarrError, setProwlarrError] = useState<string | null>(null)
  const [jackettConfigured, setJackettConfigured] = useState(false)
  const [jackettIndexers, setJackettIndexers] = useState<JackettIndexer[]>([])
  const [jackettError, setJackettError] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(true)

  const loadDiscovery = useCallback(async () => {
    setDiscovering(true)
    try {
      const response = await fetch('/api/config/indexers')
      const json = (await response.json()) as ApiEnvelope<{
        prowlarr: { configured: boolean; indexers: ProwlarrIndexer[]; error: string | null }
        jackett: { configured: boolean; indexers: JackettIndexer[]; error: string | null }
      }>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Indexer discovery failed')
      setProwlarrConfigured(json.data.prowlarr.configured)
      setProwlarrIndexers(json.data.prowlarr.indexers)
      setProwlarrError(json.data.prowlarr.error)
      setJackettConfigured(json.data.jackett.configured)
      setJackettIndexers(json.data.jackett.indexers)
      setJackettError(json.data.jackett.error)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Indexer discovery failed')
    } finally {
      setDiscovering(false)
    }
  }, [setError])

  useEffect(() => {
    void loadDiscovery()
  }, [loadDiscovery, revision])

  if (!config) return null

  function toggleProwlarr(id: number, checked: boolean) {
    updateConfig((current) => ({
      ...current,
      indexers: {
        ...current.indexers,
        prowlarr: {
          ...current.indexers.prowlarr,
          indexerIds: checked ? [...new Set([...current.indexers.prowlarr.indexerIds, id])] : current.indexers.prowlarr.indexerIds.filter((value) => value !== id),
        },
      },
    }))
  }

  function toggleJackett(id: string, checked: boolean) {
    updateConfig((current) => ({
      ...current,
      indexers: {
        ...current.indexers,
        jackett: {
          ...current.indexers.jackett,
          indexerIds: checked ? [...new Set([...current.indexers.jackett.indexerIds, id])] : current.indexers.jackett.indexerIds.filter((value) => value !== id),
        },
      },
    }))
  }

  return (
    <ConfigPage
      eyebrow="Indexers"
      title="Upstream sources"
      description="Connections and source selection for Prowlarr and Jackett. Sources refresh automatically after configuration changes."
      footer={<PageSaveBar section="indexers" />}
    >
      <ProviderCard
        title="Prowlarr"
        detail={prowlarrConfigured ? `${prowlarrIndexers.length} discovered · primary upstream` : 'URL or API key missing'}
        configured={prowlarrConfigured}
        mode={config.indexers.prowlarr.mode}
        error={prowlarrError}
        onMode={(mode) => updateConfig((current) => ({ ...current, indexers: { ...current.indexers, prowlarr: { ...current.indexers.prowlarr, mode } } }))}
        testAction={<ConnectionTestButton service="prowlarr" label="Test Prowlarr" />}
        settings={
          <div className="grid items-start gap-4 md:grid-cols-2">
            <ConnectionInput
              label="Server URL"
              placeholder="http://prowlarr:9696"
              value={config.connections.prowlarrUrl}
              onChange={(value) => updateConnection('prowlarrUrl', value)}
            />
            <SecretInput
              label="API key"
              configured={Boolean(secretStatus?.prowlarrApiKey)}
              value={secretUpdates.prowlarrApiKey ?? ''}
              onChange={(value) => updateSecret('prowlarrApiKey', value)}
            />
            <ConnectionInput
              className="md:col-span-2"
              label="Download URL"
              placeholder="Optional URL reachable by Sonarr and Radarr"
              value={config.connections.prowlarrDownloadUrl}
              onChange={(value) => updateConnection('prowlarrDownloadUrl', value)}
            />
          </div>
        }
      >
        {discovering ? (
          <IndexerListSkeleton />
        ) : (
          prowlarrIndexers.map((indexer) => (
            <IndexerChoice
              key={indexer.id}
              checked={config.indexers.prowlarr.indexerIds.includes(indexer.id)}
              disabled={config.indexers.prowlarr.mode === 'all'}
              name={indexer.name}
              meta={`${indexer.protocol ?? 'unknown'} · ${indexer.enable ? 'enabled' : 'disabled in Prowlarr'}`}
              onChange={(checked) => toggleProwlarr(indexer.id, checked)}
            />
          ))
        )}
      </ProviderCard>

      <ProviderCard
        title="Jackett"
        detail={jackettConfigured ? `${jackettIndexers.length} configured · supplemental upstream` : 'URL or API key missing'}
        configured={jackettConfigured}
        mode={config.indexers.jackett.mode}
        error={jackettError}
        onMode={(mode) => updateConfig((current) => ({ ...current, indexers: { ...current.indexers, jackett: { ...current.indexers.jackett, mode } } }))}
        testAction={<ConnectionTestButton service="jackett" label="Test Jackett" />}
        settings={
          <div className="grid items-start gap-4 md:grid-cols-2">
            <ConnectionInput
              label="Server URL"
              placeholder="http://jackett:9117"
              value={config.connections.jackettUrl}
              onChange={(value) => updateConnection('jackettUrl', value)}
            />
            <SecretInput
              label="API key"
              configured={Boolean(secretStatus?.jackettApiKey)}
              value={secretUpdates.jackettApiKey ?? ''}
              onChange={(value) => updateSecret('jackettApiKey', value)}
            />
          </div>
        }
      >
        {discovering ? (
          <IndexerListSkeleton />
        ) : (
          jackettIndexers.map((indexer) => (
            <IndexerChoice
              key={indexer.id}
              checked={config.indexers.jackett.indexerIds.includes(indexer.id)}
              disabled={config.indexers.jackett.mode === 'all'}
              name={indexer.name}
              meta={indexer.id}
              onChange={(checked) => toggleJackett(indexer.id, checked)}
            />
          ))
        )}
        {jackettConfigured && jackettIndexers.length === 0 ? <p className="px-1 py-8 text-center text-xs text-app-muted">No configured Jackett indexers found.</p> : null}
      </ProviderCard>
    </ConfigPage>
  )
}

function IndexerListSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-busy="true">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-14 w-full" rounded="lg" />
      ))}
    </div>
  )
}

function ProviderCard({
  title,
  detail,
  configured,
  mode,
  error,
  onMode,
  testAction,
  settings,
  children,
}: {
  title: string
  detail: string
  configured: boolean
  mode: 'all' | 'selected'
  error: string | null
  onMode(mode: 'all' | 'selected'): void
  testAction: ReactNode
  settings: ReactNode
  children: ReactNode
}) {
  return (
    <ConfigCard title={title} detail={detail} configured={configured}>
      <div className="rounded-xl border border-app-border/70 bg-app-subtle/25 p-4">{settings}</div>
      <Switch className="mt-4" label="Indexer scope" options={modeOptions} value={mode} disabled={!configured} onChange={(value) => onMode(value as 'all' | 'selected')} />
      {error ? <p className="mt-3 text-xs text-app-danger">{error}</p> : null}
      <div className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">{children}</div>
      <div className="mt-4 flex justify-end border-t border-app-border/70 pt-4">{testAction}</div>
    </ConfigCard>
  )
}

function IndexerChoice({ checked, disabled, name, meta, onChange }: { checked: boolean; disabled: boolean; name: string; meta: string; onChange(checked: boolean): void }) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition ${disabled ? 'opacity-45' : 'cursor-pointer hover:border-app-border hover:bg-app-subtle/50'}`}
    >
      <input type="checkbox" className="h-4 w-4 accent-app-accent" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-app-ink">{name}</span>
        <span className="mt-0.5 block truncate font-mono text-[0.6rem] text-app-muted">{meta}</span>
      </span>
    </label>
  )
}
