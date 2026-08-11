'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui'

import { useConfigForm } from './config-provider'
import type { ApiEnvelope } from './types'

export type TestableService = 'aliasarr' | 'gist' | 'tmdb' | 'bangumi' | 'prowlarr' | 'jackett' | 'sonarr' | 'radarr'

export function ConnectionTestButton({ service, label = 'Test connection' }: { service: TestableService; label?: string }) {
  const { config, secretUpdates } = useConfigForm()
  const [state, setState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    if (state !== 'success' && state !== 'error') return
    const timeout = window.setTimeout(() => {
      setState('idle')
      setDetail(null)
    }, 5000)
    return () => window.clearTimeout(timeout)
  }, [state])

  async function testConnection() {
    if (!config) return
    setState('testing')
    setDetail(null)
    try {
      const response = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, connections: config.connections, secrets: secretUpdates }),
      })
      const json = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || json.code !== 0) throw new Error(json.message || 'Connection failed')
      setState('success')
    } catch (error) {
      setState('error')
      setDetail(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const variant = state === 'success' ? 'success' : state === 'error' ? 'danger' : 'ghost'

  return (
    <span aria-live="polite">
      <Button
        className="min-w-[7.5rem] gap-2"
        size="sm"
        variant={variant}
        disabled={!config || state === 'testing'}
        title={state === 'error' ? (detail ?? undefined) : undefined}
        onClick={() => void testConnection()}
      >
        {state === 'testing' ? <SpinnerIcon /> : state === 'success' ? <CheckIcon /> : state === 'error' ? <ErrorIcon /> : null}
        {state === 'testing' ? 'Testing' : state === 'success' ? 'Connected' : state === 'error' ? 'Failed' : label}
      </Button>
    </span>
  )
}

function SpinnerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin fill-none stroke-current" strokeWidth="2">
      <circle cx="12" cy="12" r="9" className="opacity-30" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2.2">
      <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
      <path d="m6 6 8 8m0-8-8 8" strokeLinecap="round" />
    </svg>
  )
}
