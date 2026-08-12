'use client'

import { useId, useMemo, useState } from 'react'
import { FiChevronDown, FiEye, FiEyeOff, FiPlus, FiTrash2 } from 'react-icons/fi'

import { Button, Input, Tooltip } from '@/components/ui'

export interface CustomHeaderEditorRow {
  name: string
  value: string
  configured: boolean
}

export function toHeaderDrafts(rows: CustomHeaderEditorRow[]) {
  return rows.map((row) => ({
    name: row.name,
    value: row.value.length > 0 ? row.value : row.configured ? null : '',
  }))
}

export function rowsFromHeaderNames(names: string[]): CustomHeaderEditorRow[] {
  return names.map((name) => ({ name, value: '', configured: true }))
}

export function CustomHeadersEditor({
  value,
  onChange,
  description = 'Sent with every request to this host. For Cloudflare Access use CF-Access-Client-Id and CF-Access-Client-Secret (Service Token). Do not put the service API key here — use the dedicated API key field instead.',
}: {
  value: CustomHeaderEditorRow[]
  onChange(next: CustomHeaderEditorRow[]): void
  description?: string
}) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<Record<number, boolean>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const configuredCount = value.filter((row) => row.configured || (row.name.trim() && row.value)).length
  const duplicateNames = useMemo(() => {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const row of value) {
      const key = row.name.trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) duplicates.add(key)
      seen.add(key)
    }
    return duplicates
  }, [value])

  function updateRow(index: number, patch: Partial<CustomHeaderEditorRow>) {
    onChange(
      value.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        const next = { ...row, ...patch }
        // Renaming breaks the keep-existing-value merge key; require a fresh value.
        if (patch.name !== undefined && patch.name.trim().toLowerCase() !== row.name.trim().toLowerCase()) {
          next.configured = false
        }
        return next
      })
    )
  }

  function removeRow(index: number) {
    onChange(value.filter((_, rowIndex) => rowIndex !== index))
    setEditingValue({})
    setRevealed({})
  }

  function addRow() {
    onChange([...value, { name: '', value: '', configured: false }])
    setOpen(true)
  }

  return (
    <div className="md:col-span-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-app-border/80 bg-app-panel/40 px-3.5 py-2.5 text-left transition hover:border-app-border hover:bg-app-panel/70"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <span className="block text-sm font-medium text-app-ink">Custom headers</span>
          <span className="mt-0.5 block text-xs text-app-muted">{configuredCount > 0 ? `${configuredCount} configured` : 'Collapsed · click to add'}</span>
        </span>
        <FiChevronDown className={`h-4 w-4 shrink-0 text-app-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open ? (
        <div id={panelId} className="mt-3 space-y-3 rounded-xl border border-app-border/70 bg-app-panel/30 p-3">
          <p className="text-xs leading-5 text-app-muted">{description}</p>
          {value.length ? (
            <div className="space-y-2">
              {value.map((row, index) => {
                const nameKey = row.name.trim().toLowerCase()
                const duplicate = Boolean(nameKey && duplicateNames.has(nameKey))
                const dirty = row.value.length > 0
                const editing = Boolean(editingValue[index])
                const showStoredValue = row.configured && !editing && !dirty
                const showReveal = dirty
                return (
                  <div key={index} className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-start gap-2">
                      <label className="block min-w-0">
                        <span className="sr-only">Header name {index + 1}</span>
                        <Input
                          className={`w-full font-mono text-sm ${duplicate ? 'border-app-danger/50' : ''}`}
                          placeholder="CF-Access-Client-Id"
                          autoComplete="off"
                          spellCheck={false}
                          value={row.name}
                          onChange={(event) => updateRow(index, { name: event.target.value })}
                        />
                      </label>
                      <label className="relative block min-w-0">
                        <span className="sr-only">Header value {index + 1}</span>
                        <Input
                          className={`w-full pr-11 font-mono text-sm ${showReveal && !revealed[index] ? '[-webkit-text-security:disc]' : ''}`}
                          placeholder={showStoredValue ? '' : row.configured ? 'Leave blank to keep current value' : 'Header value'}
                          autoComplete="off"
                          spellCheck={false}
                          data-1p-ignore="true"
                          data-lpignore="true"
                          data-form-type="other"
                          value={row.value}
                          onFocus={() => setEditingValue((current) => ({ ...current, [index]: true }))}
                          onBlur={() => {
                            setEditingValue((current) => ({ ...current, [index]: false }))
                            setRevealed((current) => ({ ...current, [index]: false }))
                          }}
                          onChange={(event) => updateRow(index, { value: event.target.value })}
                        />
                        {showStoredValue ? (
                          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-mono text-sm tracking-[0.16em] text-app-text">••••••••••••</span>
                        ) : null}
                        {editing && showReveal ? (
                          <Tooltip
                            content={revealed[index] ? 'Hide entered value' : 'Show entered value'}
                            placement="bottom"
                            triggerClassName="absolute inset-y-0 right-0 flex w-10 items-center justify-center"
                          >
                            <button
                              type="button"
                              className="flex h-full w-full items-center justify-center text-app-muted transition hover:text-app-ink"
                              aria-label={revealed[index] ? `Hide header value ${index + 1}` : `Show header value ${index + 1}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => setRevealed((current) => ({ ...current, [index]: !current[index] }))}
                            >
                              {revealed[index] ? <FiEyeOff className="h-4 w-4" aria-hidden /> : <FiEye className="h-4 w-4" aria-hidden />}
                            </button>
                          </Tooltip>
                        ) : null}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 shrink-0 px-0"
                        aria-label={`Remove header ${index + 1}`}
                        onClick={() => removeRow(index)}
                      >
                        <FiTrash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    {duplicate ? <p className="text-xs text-app-danger">Duplicate header name</p> : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-app-muted">No custom headers yet.</p>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={addRow}>
              <FiPlus className="h-3.5 w-3.5" aria-hidden />
              Add header
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
