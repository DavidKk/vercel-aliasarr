'use client'

import { useState } from 'react'

import { Button, Input } from '@/components/ui'
import { buildCursorInstallUrl, buildMcpJsonSnippet, buildVscodeInstallUrl, MCP_API_KEY_PLACEHOLDER } from '@/lib/mcp-install'

type Status = { tone: 'ok' | 'warn'; text: string } | null

export function McpInstallPanel({ mcpUrl }: { mcpUrl: string }) {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<Status>(null)

  const effectiveKey = apiKey.trim() || MCP_API_KEY_PLACEHOLDER
  const cursorUrl = buildCursorInstallUrl(mcpUrl, effectiveKey)
  const vscodeUrl = buildVscodeInstallUrl(mcpUrl, effectiveKey, 'stable')
  const vscodeInsidersUrl = buildVscodeInstallUrl(mcpUrl, effectiveKey, 'insiders')
  const jsonSnippet = buildMcpJsonSnippet(mcpUrl, effectiveKey)

  function flash(tone: 'ok' | 'warn', text: string) {
    setStatus({ tone, text })
    window.setTimeout(() => setStatus(null), 2400)
  }

  function openProtocol(url: string, label: string) {
    try {
      // Custom protocols often do nothing as plain <a href>; assign is more reliable.
      window.location.assign(url)
      flash('ok', `Opening ${label}… If nothing happens, install the app or use Copy link.`)
    } catch {
      void copyText(url, `${label} install link`)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        fallbackCopy(text)
      }
      flash('ok', `Copied ${label}`)
    } catch {
      try {
        fallbackCopy(text)
        flash('ok', `Copied ${label}`)
      } catch {
        flash('warn', `Could not copy ${label}. Select the JSON below and copy manually.`)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 sm:col-span-2">
          <span className="ui-label">MCP endpoint</span>
          <Input className="mt-2 w-full font-mono text-[0.8rem]" readOnly value={mcpUrl} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <label className="block min-w-0 sm:col-span-2">
          <span className="ui-label">Torznab API key</span>
          <Input
            className="mt-2 w-full font-mono text-[0.8rem]"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={MCP_API_KEY_PLACEHOLDER}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <span className="mt-1.5 block text-[0.7rem] text-app-muted">From Admin → Config (Server API key). Leave blank to install with a placeholder and replace it later.</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="primary" onClick={() => openProtocol(cursorUrl, 'Cursor')}>
          Install in Cursor
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => openProtocol(vscodeUrl, 'VS Code')}>
          Install in VS Code
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => openProtocol(vscodeInsidersUrl, 'VS Code Insiders')}>
          VS Code Insiders
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void copyText(jsonSnippet, 'mcp.json')}>
          Copy mcp.json
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => void copyText(cursorUrl, 'Cursor install link')}>
          Copy Cursor link
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void copyText(vscodeUrl, 'VS Code install link')}>
          Copy VS Code link
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void copyText(vscodeInsidersUrl, 'VS Code Insiders link')}>
          Copy Insiders link
        </Button>
      </div>

      {status ? (
        <p className={`text-xs ${status.tone === 'ok' ? 'text-app-success' : 'text-app-warning'}`} role="status">
          {status.text}
        </p>
      ) : (
        <p className="text-xs text-app-muted">
          Install buttons open the desktop app via protocol handlers. If the browser ignores them, use the Copy link buttons or paste the JSON below.
        </p>
      )}

      <pre className="overflow-x-auto border border-app-border bg-app-subtle/50 p-3 font-mono text-[0.75rem] text-app-ink">
        <code>{jsonSnippet}</code>
      </pre>
    </div>
  )
}

function fallbackCopy(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(el)
  if (!ok) throw new Error('execCommand copy failed')
}
