'use client'

import { type ReactNode, useState } from 'react'

import { AdminCard, AdminCardHeader, AdminStack } from '@/components/admin-layout'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui'

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <PageHeader density="config" eyebrow={eyebrow} title={title} description={description} />
}

export function ConfigPage({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <AdminStack className="max-w-3xl">{children}</AdminStack>
      {footer}
    </section>
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

function FieldLabel({ label }: { label: string }) {
  return (
    <span className="flex h-5 items-center gap-2">
      <span className="ui-label">{label}</span>
    </span>
  )
}

export function ConnectionInput({
  label,
  placeholder,
  value,
  type = 'url',
  className = '',
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  type?: 'text' | 'url'
  className?: string
  onChange(value: string): void
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <FieldLabel label={label} />
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
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-app-muted transition hover:text-app-ink"
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            title={revealed ? 'Hide entered value' : 'Show entered value'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </span>
    </label>
  )
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="m3 3 18 18M10.6 6.1A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16.4 16.4 0 0 1-3 3.5M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5M9.9 9.9A3 3 0 0 0 14.1 14" />
    </svg>
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
