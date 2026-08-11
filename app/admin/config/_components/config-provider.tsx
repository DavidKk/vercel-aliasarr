'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

import type { AliasarrConfig, AliasarrSecretName, AliasarrSecretStatus } from '@/services/config'

import type { ApiEnvelope } from './types'

export type ConfigSection = 'services' | 'indexers' | 'applications'

interface ConfigContextValue {
  config: AliasarrConfig | null
  encrypted: boolean
  error: string | null
  loading: boolean
  message: string | null
  revision: string | null
  saving: boolean
  secretStatus: AliasarrSecretStatus | null
  secretUpdates: Partial<Record<AliasarrSecretName, string>>
  storage: 'local-file' | 'vercel-kv'
  storageConfigured: boolean
  load(): Promise<void>
  save(section: ConfigSection): Promise<void>
  setError(message: string | null): void
  setMessage(message: string | null): void
  updateConfig(updater: (current: AliasarrConfig) => AliasarrConfig): void
  updateConnection(name: keyof AliasarrConfig['connections'], value: string): void
  updateSecret(name: AliasarrSecretName, value: string): void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AliasarrConfig | null>(null)
  const [revision, setRevision] = useState<string | null>(null)
  const [storageConfigured, setStorageConfigured] = useState(true)
  const [storage, setStorage] = useState<'local-file' | 'vercel-kv'>('local-file')
  const [encrypted, setEncrypted] = useState(false)
  const [secretStatus, setSecretStatus] = useState<AliasarrSecretStatus | null>(null)
  const [secretUpdates, setSecretUpdates] = useState<Partial<Record<AliasarrSecretName, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/config')
      const json = (await response.json()) as ApiEnvelope<{
        config: AliasarrConfig
        configured: boolean
        revision: string | null
        storage: 'local-file' | 'vercel-kv'
        encrypted: boolean
        secretStatus: AliasarrSecretStatus
      }>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Configuration request failed')
      setConfig(json.data.config)
      setRevision(json.data.revision)
      setStorageConfigured(json.data.configured)
      setStorage(json.data.storage)
      setEncrypted(json.data.encrypted)
      setSecretStatus(json.data.secretStatus)
      setSecretUpdates({})
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function updateConfig(updater: (current: AliasarrConfig) => AliasarrConfig) {
    setConfig((current) => (current ? updater(current) : current))
    setMessage(null)
  }

  function updateConnection(name: keyof AliasarrConfig['connections'], value: string) {
    updateConfig((current) => ({ ...current, connections: { ...current.connections, [name]: value } }))
  }

  function updateSecret(name: AliasarrSecretName, value: string) {
    setSecretUpdates((current) => ({ ...current, [name]: value }))
    setMessage(null)
  }

  async function save(section: ConfigSection) {
    if (!config) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, secrets: secretUpdates, revision, section }),
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
    updateSecret,
  }

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfigForm(): ConfigContextValue {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfigForm must be used inside ConfigProvider')
  return context
}
