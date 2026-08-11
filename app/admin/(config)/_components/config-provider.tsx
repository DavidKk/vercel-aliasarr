'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

import { useNotification } from '@/components/ui'
import type { AliasarrConfig, AliasarrSecretStatus, AliasarrStringConnection, AliasarrStringSecretName, CustomHeaderSecretName } from '@/services/config'

import { type CustomHeaderEditorRow, rowsFromHeaderNames, toHeaderDrafts } from './custom-headers-editor'
import type { ApiEnvelope } from './types'

export type ConfigSection = 'services' | 'indexers' | 'applications'

type CustomHeadersState = Record<CustomHeaderSecretName, CustomHeaderEditorRow[]>

const emptyCustomHeaders = (): CustomHeadersState => ({
  prowlarrHeaders: [],
  jackettHeaders: [],
  sonarrHeaders: [],
  radarrHeaders: [],
})

const sectionHeaderSecrets: Record<ConfigSection, CustomHeaderSecretName[]> = {
  services: [],
  indexers: ['prowlarrHeaders', 'jackettHeaders'],
  applications: ['sonarrHeaders', 'radarrHeaders'],
}

interface ConfigContextValue {
  config: AliasarrConfig | null
  customHeaders: CustomHeadersState
  encrypted: boolean
  error: string | null
  loading: boolean
  message: string | null
  revision: string | null
  saving: boolean
  secretStatus: AliasarrSecretStatus | null
  secretUpdates: Partial<Record<AliasarrStringSecretName, string>>
  storage: 'local-file' | 'vercel-kv'
  storageConfigured: boolean
  load(): Promise<void>
  save(section: ConfigSection): Promise<void>
  setError(message: string | null): void
  setMessage(message: string | null): void
  updateConfig(updater: (current: AliasarrConfig) => AliasarrConfig): void
  updateConnection(name: AliasarrStringConnection, value: string): void
  updateCustomHeaders(name: CustomHeaderSecretName, rows: CustomHeaderEditorRow[]): void
  updateSecret(name: AliasarrStringSecretName, value: string): void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const notification = useNotification()
  const [config, setConfig] = useState<AliasarrConfig | null>(null)
  const [revision, setRevision] = useState<string | null>(null)
  const [storageConfigured, setStorageConfigured] = useState(true)
  const [storage, setStorage] = useState<'local-file' | 'vercel-kv'>('local-file')
  const [encrypted, setEncrypted] = useState(false)
  const [secretStatus, setSecretStatus] = useState<AliasarrSecretStatus | null>(null)
  const [secretUpdates, setSecretUpdates] = useState<Partial<Record<AliasarrStringSecretName, string>>>({})
  const [customHeaders, setCustomHeaders] = useState<CustomHeadersState>(emptyCustomHeaders)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessageState] = useState<string | null>(null)
  const [error, setErrorState] = useState<string | null>(null)

  const setError = useCallback(
    (next: string | null) => {
      setErrorState(next)
      if (next) notification.error(next)
    },
    [notification]
  )

  const setMessage = useCallback(
    (next: string | null) => {
      setMessageState(next)
      if (next) notification.success(next)
    },
    [notification]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setErrorState(null)
    try {
      const response = await fetch('/api/config')
      const json = (await response.json()) as ApiEnvelope<{
        config: AliasarrConfig
        configured: boolean
        revision: string | null
        storage: 'local-file' | 'vercel-kv'
        encrypted: boolean
        secretStatus: AliasarrSecretStatus
        customHeaderNames: Record<CustomHeaderSecretName, string[]>
      }>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Configuration request failed')
      setConfig(json.data.config)
      setRevision(json.data.revision)
      setStorageConfigured(json.data.configured)
      setStorage(json.data.storage)
      setEncrypted(json.data.encrypted)
      setSecretStatus(json.data.secretStatus)
      setSecretUpdates({})
      const names = json.data.customHeaderNames
      setCustomHeaders({
        prowlarrHeaders: rowsFromHeaderNames(names?.prowlarrHeaders ?? []),
        jackettHeaders: rowsFromHeaderNames(names?.jackettHeaders ?? []),
        sonarrHeaders: rowsFromHeaderNames(names?.sonarrHeaders ?? []),
        radarrHeaders: rowsFromHeaderNames(names?.radarrHeaders ?? []),
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }, [setError])

  useEffect(() => {
    void load()
  }, [load])

  function updateConfig(updater: (current: AliasarrConfig) => AliasarrConfig) {
    setConfig((current) => (current ? updater(current) : current))
    setMessageState(null)
  }

  function updateConnection(name: AliasarrStringConnection, value: string) {
    updateConfig((current) => ({ ...current, connections: { ...current.connections, [name]: value } }))
  }

  function updateSecret(name: AliasarrStringSecretName, value: string) {
    setSecretUpdates((current) => ({ ...current, [name]: value }))
    setMessageState(null)
  }

  function updateCustomHeaders(name: CustomHeaderSecretName, rows: CustomHeaderEditorRow[]) {
    setCustomHeaders((current) => ({ ...current, [name]: rows }))
    setMessageState(null)
  }

  function secretsPayload(section: ConfigSection) {
    const headers = Object.fromEntries(sectionHeaderSecrets[section].map((name) => [name, toHeaderDrafts(customHeaders[name])]))
    return { ...secretUpdates, ...headers }
  }

  async function save(section: ConfigSection) {
    if (!config) return
    for (const name of sectionHeaderSecrets[section]) {
      const seen = new Set<string>()
      for (const row of customHeaders[name]) {
        const key = row.name.trim().toLowerCase()
        if (!key) continue
        if (seen.has(key)) {
          setError(`Duplicate custom header "${row.name.trim()}"`)
          return
        }
        seen.add(key)
      }
    }

    setSaving(true)
    setErrorState(null)
    setMessageState(null)
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, secrets: secretsPayload(section), revision, section }),
      })
      const json = (await response.json()) as ApiEnvelope<{ revision: string | null }>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Save failed')
      setRevision(json.data.revision)
      setSecretUpdates({})
      setMessage(`Configuration saved to ${storage === 'vercel-kv' ? 'Upstash Redis' : 'the local file'}.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const value: ConfigContextValue = {
    config,
    customHeaders,
    encrypted,
    error,
    loading,
    message,
    revision,
    saving,
    secretStatus,
    secretUpdates,
    storage,
    storageConfigured,
    load,
    save,
    setError,
    setMessage,
    updateConfig,
    updateConnection,
    updateCustomHeaders,
    updateSecret,
  }

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfigForm(): ConfigContextValue {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfigForm must be used inside ConfigProvider')
  return context
}
