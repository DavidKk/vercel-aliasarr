'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { MultiSelect } from '@/components/ui'
import { effectiveSearchLanguages, normalizeLanguageCode, toIndexerLocale } from '@/services/indexers/languages'

import { useConfigForm } from '../_components/config-provider'
import { ConnectionTestButton } from '../_components/connection-test-button'
import { CustomHeadersEditor } from '../_components/custom-headers-editor'
import { IndexerChoice } from '../_components/indexer-choice'
import { languageOptions, pickLanguageValues } from '../_components/indexer-language'
import { IndexerListPanel } from '../_components/indexer-list-panel'
import { PageSaveBar } from '../_components/page-save-bar'
import { ProviderCard } from '../_components/provider-card'
import type { ApiEnvelope, JackettIndexer, ProwlarrIndexer } from '../_components/types'
import { ConfigCard, ConfigPage, ConnectionInput, SecretInput } from '../_components/ui'

export default function IndexersConfigPage() {
  const { config, customHeaders, revision, secretStatus, secretUpdates, setError, updateConfig, updateConnection, updateCustomHeaders, updateSecret } = useConfigForm()
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

  const perIndexerLanguageOptions = useMemo(() => {
    const effective = effectiveSearchLanguages(config?.indexers.languages)
    if (!effective.length) return languageOptions
    const allowed = new Set(effective.map(normalizeLanguageCode))
    return languageOptions.filter((option) => allowed.has(normalizeLanguageCode(option.value)))
  }, [config?.indexers.languages])

  if (!config) return null

  const form = config
  const prowlarrSelectableIds = prowlarrIndexers.filter((indexer) => indexer.enable).map((indexer) => indexer.id)
  const jackettSelectableIds = jackettIndexers.map((indexer) => indexer.id)

  function isProwlarrChecked(id: number): boolean {
    if (form.indexers.prowlarr.mode === 'all') return true
    return form.indexers.prowlarr.indexerIds.includes(id)
  }

  function isJackettChecked(id: string): boolean {
    if (form.indexers.jackett.mode === 'all') return true
    return form.indexers.jackett.indexerIds.includes(id)
  }

  function toggleProwlarr(id: number, checked: boolean) {
    updateConfig((current) => {
      const baseIds = current.indexers.prowlarr.mode === 'all' ? prowlarrSelectableIds : current.indexers.prowlarr.indexerIds
      const nextIds = checked ? [...new Set([...baseIds, id])] : baseIds.filter((value) => value !== id)
      const selectsAll = prowlarrSelectableIds.length > 0 && prowlarrSelectableIds.every((value) => nextIds.includes(value))
      return {
        ...current,
        indexers: {
          ...current.indexers,
          prowlarr: {
            ...current.indexers.prowlarr,
            mode: selectsAll ? 'all' : 'selected',
            indexerIds: selectsAll ? [] : nextIds,
          },
        },
      }
    })
  }

  function toggleJackett(id: string, checked: boolean) {
    updateConfig((current) => {
      const baseIds = current.indexers.jackett.mode === 'all' ? jackettSelectableIds : current.indexers.jackett.indexerIds
      const nextIds = checked ? [...new Set([...baseIds, id])] : baseIds.filter((value) => value !== id)
      const selectsAll = jackettSelectableIds.length > 0 && jackettSelectableIds.every((value) => nextIds.includes(value))
      return {
        ...current,
        indexers: {
          ...current.indexers,
          jackett: {
            ...current.indexers.jackett,
            mode: selectsAll ? 'all' : 'selected',
            indexerIds: selectsAll ? [] : nextIds,
          },
        },
      }
    })
  }

  function setProwlarrLanguages(id: number, languages: string[]) {
    updateConfig((current) => {
      const nextOverrides = { ...current.indexers.prowlarr.languageOverrides }
      const locales = [...new Set(languages.map(toIndexerLocale).filter(Boolean))]
      if (!locales.length) delete nextOverrides[String(id)]
      else nextOverrides[String(id)] = locales
      return {
        ...current,
        indexers: {
          ...current.indexers,
          prowlarr: { ...current.indexers.prowlarr, languageOverrides: nextOverrides },
        },
      }
    })
  }

  function setJackettLanguages(id: string, languages: string[]) {
    updateConfig((current) => {
      const nextOverrides = { ...current.indexers.jackett.languageOverrides }
      const locales = [...new Set(languages.map(toIndexerLocale).filter(Boolean))]
      if (!locales.length) delete nextOverrides[id]
      else nextOverrides[id] = locales
      return {
        ...current,
        indexers: {
          ...current.indexers,
          jackett: { ...current.indexers.jackett, languageOverrides: nextOverrides },
        },
      }
    })
  }

  return (
    <ConfigPage
      eyebrow="Configuration / Upstream"
      title="Indexers"
      description="Connections and source selection for Prowlarr and Jackett. Sources refresh automatically after configuration changes."
      footer={<PageSaveBar section="indexers" />}
    >
      <ConfigCard title="Search languages" detail="Global allowlist for title queries and indexer matching" configured>
        <MultiSelect
          label="Languages"
          placeholder="Select languages"
          allSelectedLabel="All languages"
          selectAllLabel="Select all"
          clearLabel="Clear all"
          descriptionTooltip="Defaults to all locales. Clear is allowed while editing; save requires at least one language. Per-indexer rows use the upstream locale unless overridden."
          options={languageOptions}
          value={form.indexers.languages ?? []}
          onChange={(languages) => updateConfig((current) => ({ ...current, indexers: { ...current.indexers, languages } }))}
        />
      </ConfigCard>

      <ProviderCard
        title="Prowlarr"
        detail={prowlarrConfigured ? `${prowlarrIndexers.length} discovered · primary upstream` : 'URL or API key missing'}
        configured={prowlarrConfigured}
        error={prowlarrError}
        testAction={<ConnectionTestButton service="prowlarr" label="Test Prowlarr" />}
        settings={
          <div className="grid items-start gap-4 md:grid-cols-2">
            <ConnectionInput
              label="Server URL"
              placeholder="http://prowlarr:9696"
              value={form.connections.prowlarrUrl}
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
              placeholder="https://prowlarr.example.com"
              descriptionTooltip="Optional public URL reachable by Sonarr and Radarr when the Server URL is only available on the private network."
              value={form.connections.prowlarrDownloadUrl}
              onChange={(value) => updateConnection('prowlarrDownloadUrl', value)}
            />
            <CustomHeadersEditor
              value={customHeaders.prowlarrHeaders}
              onChange={(rows) => updateCustomHeaders('prowlarrHeaders', rows)}
              description="Sent with every request to this host. For Cloudflare Access use CF-Access-Client-Id and CF-Access-Client-Secret (Service Token). Do not put the Prowlarr API key here — use the API key field above."
            />
          </div>
        }
      >
        <IndexerListPanel
          discovering={discovering}
          emptyLabel={prowlarrConfigured ? 'No matching Prowlarr indexers.' : 'Configure Prowlarr to discover indexers.'}
          items={prowlarrIndexers.map((indexer) => ({
            key: String(indexer.id),
            searchText: `${indexer.name} ${indexer.protocol ?? ''} ${indexer.language ?? ''} ${indexer.enable ? 'enabled' : 'disabled'}`.toLowerCase(),
            node: (
              <IndexerChoice
                checked={isProwlarrChecked(indexer.id)}
                disabled={!prowlarrConfigured || !indexer.enable}
                name={indexer.name}
                meta={`${indexer.protocol ?? 'unknown'} · ${indexer.enable ? 'enabled' : 'disabled in Prowlarr'}`}
                languageOptions={perIndexerLanguageOptions}
                language={pickLanguageValues(form.indexers.prowlarr.languageOverrides?.[String(indexer.id)], indexer.language, perIndexerLanguageOptions)}
                onChange={(checked) => toggleProwlarr(indexer.id, checked)}
                onLanguageChange={(languages) => setProwlarrLanguages(indexer.id, languages)}
              />
            ),
          }))}
        />
      </ProviderCard>

      <ProviderCard
        title="Jackett"
        detail={jackettConfigured ? `${jackettIndexers.length} configured · supplemental upstream` : 'URL or API key missing'}
        configured={jackettConfigured}
        error={jackettError}
        testAction={<ConnectionTestButton service="jackett" label="Test Jackett" />}
        settings={
          <div className="grid items-start gap-4 md:grid-cols-2">
            <ConnectionInput label="Server URL" placeholder="http://jackett:9117" value={form.connections.jackettUrl} onChange={(value) => updateConnection('jackettUrl', value)} />
            <SecretInput
              label="API key"
              configured={Boolean(secretStatus?.jackettApiKey)}
              value={secretUpdates.jackettApiKey ?? ''}
              onChange={(value) => updateSecret('jackettApiKey', value)}
            />
            <CustomHeadersEditor
              value={customHeaders.jackettHeaders}
              onChange={(rows) => updateCustomHeaders('jackettHeaders', rows)}
              description="Sent with every request to this host. For Cloudflare Access use CF-Access-Client-Id and CF-Access-Client-Secret (Service Token). Do not put the Jackett API key here — use the API key field above."
            />
          </div>
        }
      >
        <IndexerListPanel
          discovering={discovering}
          emptyLabel={jackettConfigured ? 'No matching Jackett indexers.' : 'Configure Jackett to discover indexers.'}
          items={jackettIndexers.map((indexer) => ({
            key: indexer.id,
            searchText: `${indexer.name} ${indexer.id}`.toLowerCase(),
            node: (
              <IndexerChoice
                checked={isJackettChecked(indexer.id)}
                disabled={!jackettConfigured}
                name={indexer.name}
                meta={indexer.id}
                languageOptions={perIndexerLanguageOptions}
                language={pickLanguageValues(form.indexers.jackett.languageOverrides?.[indexer.id], undefined, perIndexerLanguageOptions)}
                onChange={(checked) => toggleJackett(indexer.id, checked)}
                onLanguageChange={(languages) => setJackettLanguages(indexer.id, languages)}
              />
            ),
          }))}
        />
      </ProviderCard>
    </ConfigPage>
  )
}
