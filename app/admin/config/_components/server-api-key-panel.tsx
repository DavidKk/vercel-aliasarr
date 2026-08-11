'use client'

import { Button, Input } from '@/components/ui'

export function ServerApiKeyField({ apiKey, configured, busy, copied, onCopy }: { apiKey: string; configured: boolean; busy: boolean; copied: boolean; onCopy(): void }) {
  return (
    <label className="block min-w-0">
      <span className="flex h-5 items-center gap-2">
        <span className="ui-label">Server API key</span>
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
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-app-muted transition hover:text-app-ink disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={copied ? 'Server API key copied' : 'Copy Server API key'}
          title={copied ? 'Copied' : 'Copy Server API key'}
          disabled={!configured || !apiKey || busy}
          onClick={onCopy}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
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

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7">
      <rect x="6.5" y="6.5" width="9" height="9" rx="1.5" />
      <path d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
