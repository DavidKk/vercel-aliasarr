'use client'

import { type ReactNode, useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

import { AdminPageHeader } from '@/components/admin-chrome'
import { AdminCard, AdminCardHeader, AdminStack } from '@/components/admin-layout'
import { FieldHint, Input, Tooltip } from '@/components/ui'

import { useConfigForm } from './config-provider'

export function ConfigPage({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section>
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} status={<ConfigStorageStatus />} />
      <AdminStack className="max-w-3xl">{children}</AdminStack>
      {footer}
    </section>
  )
}

function ConfigStorageStatus() {
  const { encrypted, storage, storageConfigured } = useConfigForm()
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusPill ok={storageConfigured}>{storage === 'vercel-kv' ? 'Upstash Redis' : 'Local file'}</StatusPill>
      <StatusPill ok={encrypted}>{encrypted ? 'Encrypted' : 'Pending encryption'}</StatusPill>
    </span>
  )
}

export function ConfigCard({ title, detail, configured, status, children }: { title: string; detail: string; configured?: boolean; status?: ReactNode; children: ReactNode }) {
  return (
    <AdminCard>
      <AdminCardHeader
        title={title}
        detail={detail}
        status={status ?? (configured !== undefined ? <StatusPill ok={configured}>{configured ? 'Configured' : 'Incomplete'}</StatusPill> : undefined)}
      />
      {children}
    </AdminCard>
  )
}

function FieldLabel({ label, descriptionTooltip }: { label: string; descriptionTooltip?: string }) {
  return (
    <span className="flex h-5 items-center gap-2">
      <span className="ui-label">{label}</span>
      {descriptionTooltip ? <FieldHint content={descriptionTooltip} /> : null}
    </span>
  )
}

export function ConnectionInput({
  label,
  placeholder,
  value,
  type = 'url',
  className = '',
  descriptionTooltip,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  type?: 'text' | 'url'
  className?: string
  descriptionTooltip?: string
  onChange(value: string): void
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <FieldLabel label={label} descriptionTooltip={descriptionTooltip} />
      <Input className="mt-2 w-full" type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function SecretInput({ label, configured, value, onChange }: { label: string; configured: boolean; value: string; onChange(value: string): void }) {
  const [editing, setEditing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const dirty = value.length > 0
  const showStoredValue = configured && !editing && !dirty

  return (
    <label className="block min-w-0">
      <FieldLabel label={label} />
      <span className="relative mt-2 block">
        <Input
          className={`w-full pr-11 font-mono ${dirty && !revealed ? '[-webkit-text-security:disc]' : ''}`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          placeholder={editing || configured ? '' : 'Click to configure'}
          value={value}
          onFocus={() => setEditing(true)}
          onBlur={() => {
            setEditing(false)
            setRevealed(false)
          }}
          onChange={(event) => onChange(event.target.value)}
        />
        {showStoredValue ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-mono text-sm tracking-[0.16em] text-app-text">••••••••••••</span>
        ) : null}
        {editing && dirty ? (
          <Tooltip
            content={revealed ? 'Hide entered value' : 'Show entered value'}
            placement="left"
            triggerClassName="absolute inset-y-0 right-0 flex w-10 items-center justify-center"
          >
            <button
              type="button"
              className="flex h-full w-full items-center justify-center text-app-muted transition hover:text-app-ink"
              aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? <FiEyeOff className="h-4 w-4" aria-hidden /> : <FiEye className="h-4 w-4" aria-hidden />}
            </button>
          </Tooltip>
        ) : null}
      </span>
    </label>
  )
}

export function StatusPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold ${ok ? 'bg-app-successSoft text-app-success' : 'bg-app-dangerSoft text-app-danger'}`}>
      {children}
    </span>
  )
}

export function Notice({ tone, children }: { tone: 'success' | 'danger' | 'warning'; children: ReactNode }) {
  const classes =
    tone === 'success'
      ? 'border-app-success/20 bg-app-successSoft text-app-success'
      : tone === 'warning'
        ? 'border-app-warning/20 bg-app-warningSoft text-app-warning'
        : 'border-app-danger/20 bg-app-dangerSoft text-app-danger'
  return <p className={`mb-4 rounded-xl border px-3 py-2.5 text-sm ${classes}`}>{children}</p>
}
