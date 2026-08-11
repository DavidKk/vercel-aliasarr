'use client'

import { useEffect, useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'

import { ButtonLink } from '@/components/ui'

import { useConfigForm } from '../_components/config-provider'
import { ConnectionTestButton } from '../_components/connection-test-button'
import { PageSaveBar } from '../_components/page-save-bar'
import { ServerApiKeyActions, ServerApiKeyField } from '../_components/server-api-key-panel'
import type { ApiEnvelope } from '../_components/types'
import { ConfigCard, ConfigPage, ConnectionInput, SecretInput } from '../_components/ui'

export default function ServicesConfigPage() {
  const { config, load, revision, secretStatus, secretUpdates, setError, setMessage, updateConnection, updateSecret } = useConfigForm()
  const serverKeyConfigured = Boolean(secretStatus?.torznabApiKey)
  const [serverApiKey, setServerApiKey] = useState('')
  const [serverKeyBusy, setServerKeyBusy] = useState(false)
  const [serverKeyCopied, setServerKeyCopied] = useState(false)
  const [serverKeyLoading, setServerKeyLoading] = useState(false)

  useEffect(() => {
    if (!serverKeyCopied) return
    const timeout = window.setTimeout(() => setServerKeyCopied(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [serverKeyCopied])

  useEffect(() => {
    if (!serverKeyConfigured) {
      setServerApiKey('')
      return
    }
    let cancelled = false
    setServerKeyLoading(true)
    void (async () => {
      try {
        const response = await fetch('/api/config/server-key', { cache: 'no-store' })
        const json = (await response.json()) as ApiEnvelope<{ apiKey: string }>
        if (!response.ok || json.code !== 0) throw new Error(json.message || 'Unable to load Server API key')
        if (!cancelled) setServerApiKey(json.data.apiKey)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load Server API key')
      } finally {
        if (!cancelled) setServerKeyLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [revision, serverKeyConfigured, setError])

  if (!config) return null
  const gistId = config.connections.gistId.trim()

  async function copyServerKey() {
    if (!serverApiKey) return
    setServerKeyBusy(true)
    setError(null)
    try {
      await navigator.clipboard.writeText(serverApiKey)
      setServerKeyCopied(true)
      setMessage('Server API key copied to the clipboard.')
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy Server API key')
    } finally {
      setServerKeyBusy(false)
    }
  }

  async function generateServerKey() {
    setServerKeyBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/config/server-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision }),
      })
      const json = (await response.json()) as ApiEnvelope<{ apiKey: string; revision: string }>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Server API key generation failed')
      setServerApiKey(json.data.apiKey)
      try {
        await navigator.clipboard.writeText(json.data.apiKey)
        setServerKeyCopied(true)
        setMessage(`Server API key ${serverKeyConfigured ? 'regenerated' : 'generated'} and copied to the clipboard.`)
      } catch {
        setMessage(`Server API key ${serverKeyConfigured ? 'regenerated' : 'generated'}. Use the copy icon to copy it.`)
      }
      await load()
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Server API key generation failed')
    } finally {
      setServerKeyBusy(false)
    }
  }

  return (
    <ConfigPage
      eyebrow="Configuration / Connections"
      title="Services"
      description="Each external system owns its connection fields, credentials, and actions."
      footer={<PageSaveBar section="services" />}
    >
      <ConfigCard
        title="Aliasarr server"
        detail="Endpoint exposed to Sonarr, Radarr, and other Torznab clients"
        configured={Boolean(config.connections.aliasarrUrl && secretStatus?.torznabApiKey)}
      >
        <div className="grid items-start gap-4 md:grid-cols-2">
          <ConnectionInput
            label="Torznab URL"
            placeholder="https://aliasarr.example.com/api/torznab"
            value={config.connections.aliasarrUrl}
            onChange={(value) => updateConnection('aliasarrUrl', value)}
          />
          <ServerApiKeyField
            apiKey={serverApiKey}
            configured={serverKeyConfigured}
            busy={serverKeyBusy || serverKeyLoading}
            copied={serverKeyCopied}
            onCopy={() => void copyServerKey()}
          />
        </div>
        <ServerApiKeyActions configured={serverKeyConfigured} busy={serverKeyBusy} onGenerate={() => void generateServerKey()} />
      </ConfigCard>

      <ConfigCard
        title="Gist alias storage"
        detail="Persistent source of truth for multilingual titles and automatic alias write-back"
        configured={Boolean(config.connections.gistId && secretStatus?.gistToken)}
      >
        <div className="grid items-start gap-4 md:grid-cols-2">
          <ConnectionInput label="Gist ID" type="text" placeholder="GitHub Gist ID" value={config.connections.gistId} onChange={(value) => updateConnection('gistId', value)} />
          <SecretInput
            label="Gist token"
            configured={Boolean(secretStatus?.gistToken)}
            value={secretUpdates.gistToken ?? ''}
            onChange={(value) => updateSecret('gistToken', value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-app-border/70 pt-4">
          {gistId ? (
            <ButtonLink href={`https://gist.github.com/${encodeURIComponent(gistId)}`} target="_blank" rel="noreferrer" variant="ghost" size="sm">
              Open Gist
              <FiArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </ButtonLink>
          ) : null}
          <ConnectionTestButton service="gist" label="Test Gist" />
        </div>
      </ConfigCard>

      <ConfigCard title="TMDB metadata" detail="Fallback source for movie and series titles, IDs, and translations" configured={Boolean(secretStatus?.tmdbApiKey)}>
        <SecretInput
          label="TMDB API key"
          configured={Boolean(secretStatus?.tmdbApiKey)}
          value={secretUpdates.tmdbApiKey ?? ''}
          onChange={(value) => updateSecret('tmdbApiKey', value)}
        />
        <div className="mt-4 flex justify-end border-t border-app-border/70 pt-4">
          <ConnectionTestButton service="tmdb" label="Test TMDB" />
        </div>
      </ConfigCard>

      <ConfigCard title="Bangumi metadata" detail="Optional fallback for Chinese and Japanese animation titles" configured={Boolean(secretStatus?.bangumiAccessToken)}>
        <SecretInput
          label="Bangumi access token"
          configured={Boolean(secretStatus?.bangumiAccessToken)}
          value={secretUpdates.bangumiAccessToken ?? ''}
          onChange={(value) => updateSecret('bangumiAccessToken', value)}
        />
        <div className="mt-4 flex justify-end border-t border-app-border/70 pt-4">
          <ConnectionTestButton service="bangumi" label="Test Bangumi" />
        </div>
      </ConfigCard>
    </ConfigPage>
  )
}
