'use client'

import { FiCheck, FiCopy } from 'react-icons/fi'

import { Button, FieldHint, Input, Tooltip } from '@/components/ui'

export function publicTorznabUrl(origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin.replace(/\/+$/, '')}/api/torznab`
}

export function TorznabUrlField({ url, copied, onCopy }: { url: string; copied: boolean; onCopy(): void }) {
  return (
    <label className="block min-w-0">
      <span className="flex h-5 items-center gap-2">
        <span className="ui-label">Torznab URL</span>
        <FieldHint content="Derived from this deployment host. Use it as the Torznab indexer URL in Sonarr or Radarr." />
      </span>
      <span className="relative mt-2 block">
        <Input
          className="w-full cursor-text select-all pr-11 font-mono"
          type="text"
          readOnly
          value={url}
          onClick={(event) => event.currentTarget.select()}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Tooltip content={copied ? 'Copied' : 'Copy Torznab URL'} placement="bottom" triggerClassName="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
          <button
            type="button"
            className="flex h-full w-full items-center justify-center text-app-muted transition hover:text-app-ink disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={copied ? 'Torznab URL copied' : 'Copy Torznab URL'}
            disabled={!url}
            onClick={onCopy}
          >
            {copied ? <FiCheck className="h-4 w-4" aria-hidden /> : <FiCopy className="h-4 w-4" aria-hidden />}
          </button>
        </Tooltip>
      </span>
    </label>
  )
}

export function ServerApiKeyField({ apiKey, configured, busy, copied, onCopy }: { apiKey: string; configured: boolean; busy: boolean; copied: boolean; onCopy(): void }) {
  return (
    <label className="block min-w-0">
      <span className="flex h-5 items-center gap-2">
        <span className="ui-label">Server API key</span>
        <FieldHint content="Used by Torznab clients and MCP installs. Regenerating invalidates existing clients." />
      </span>
      <span className="relative mt-2 block">
        <Input
          className="w-full cursor-text select-all pr-11 font-mono"
          type="text"
          readOnly
          value={apiKey}
          placeholder={busy && configured ? 'Loading key…' : 'Generate a key to continue'}
          onClick={(event) => event.currentTarget.select()}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Tooltip content={copied ? 'Copied' : 'Copy Server API key'} placement="bottom" triggerClassName="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
          <button
            type="button"
            className="flex h-full w-full items-center justify-center text-app-muted transition hover:text-app-ink disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={copied ? 'Server API key copied' : 'Copy Server API key'}
            disabled={!configured || !apiKey || busy}
            onClick={onCopy}
          >
            {copied ? <FiCheck className="h-4 w-4" aria-hidden /> : <FiCopy className="h-4 w-4" aria-hidden />}
          </button>
        </Tooltip>
      </span>
    </label>
  )
}

export function ServerApiKeyActions({ configured, busy, onGenerate }: { configured: boolean; busy: boolean; onGenerate(): void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-app-border/70 pt-4">
      <p className="text-[0.65rem] text-app-muted">
        {configured ? 'Regenerating invalidates the key used by existing Torznab clients.' : 'A secure key is generated and encrypted automatically.'}
      </p>
      <Button size="sm" variant={configured ? 'danger' : 'primary'} disabled={busy} onClick={onGenerate}>
        {busy ? 'Working…' : configured ? 'Regenerate API key' : 'Generate API key'}
      </Button>
    </div>
  )
}
