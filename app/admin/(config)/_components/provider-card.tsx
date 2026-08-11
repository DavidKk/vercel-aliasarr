'use client'

import { type ReactNode } from 'react'

import { ConfigCard } from './ui'

export function ProviderCard({
  title,
  detail,
  configured,
  error,
  testAction,
  settings,
  children,
}: {
  title: string
  detail: string
  configured: boolean
  error: string | null
  testAction: ReactNode
  settings: ReactNode
  children: ReactNode
}) {
  return (
    <ConfigCard title={title} detail={detail} configured={configured}>
      <div className="rounded-xl border border-app-border/70 bg-app-subtle/25 p-4">{settings}</div>
      {error ? <p className="mt-3 text-xs text-app-danger">{error}</p> : null}
      {children}
      <div className="mt-4 flex justify-end border-t border-app-border/70 pt-4">{testAction}</div>
    </ConfigCard>
  )
}
