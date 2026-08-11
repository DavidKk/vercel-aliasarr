'use client'

import { useEffect, useState } from 'react'
import { FiCheck, FiLoader, FiX } from 'react-icons/fi'

import { Button, useNotification } from '@/components/ui'

import { useConfigForm } from './config-provider'
import type { ApiEnvelope } from './types'

export type TestableService = 'aliasarr' | 'gist' | 'tmdb' | 'bangumi' | 'prowlarr' | 'jackett' | 'sonarr' | 'radarr'

export function ConnectionTestButton({ service, label = 'Test connection' }: { service: TestableService; label?: string }) {
  const { config, secretUpdates } = useConfigForm()
  const notification = useNotification()
  const [state, setState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (state !== 'success' && state !== 'error') return
    const timeout = window.setTimeout(() => setState('idle'), 5000)
    return () => window.clearTimeout(timeout)
  }, [state])

  async function testConnection() {
    if (!config) return
    setState('testing')
    try {
      const response = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, connections: config.connections, secrets: secretUpdates }),
      })
      const json = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Connection failed')
      setState('success')
      notification.success(`${label.replace(/^Test\s+/i, '')} connected`)
    } catch (error) {
      setState('error')
      notification.error(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const variant = state === 'success' ? 'success' : state === 'error' ? 'danger' : 'ghost'

  return (
    <span aria-live="polite">
      <Button className="min-w-[7.5rem] gap-2" size="sm" variant={variant} disabled={!config || state === 'testing'} onClick={() => void testConnection()}>
        {state === 'testing' ? (
          <FiLoader className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : state === 'success' ? (
          <FiCheck className="h-3.5 w-3.5" aria-hidden />
        ) : state === 'error' ? (
          <FiX className="h-3.5 w-3.5" aria-hidden />
        ) : null}
        {state === 'testing' ? 'Testing' : state === 'success' ? 'Connected' : state === 'error' ? 'Failed' : label}
      </Button>
    </span>
  )
}
