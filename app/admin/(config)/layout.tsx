'use client'

import type { ReactNode } from 'react'

import { ConfigContentSkeleton } from '@/components/page-skeletons'

import { ConfigProvider, useConfigForm } from './_components/config-provider'
import { Notice } from './_components/ui'

export default function ConfigSectionLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ConfigShell>{children}</ConfigShell>
    </ConfigProvider>
  )
}

function ConfigShell({ children }: { children: ReactNode }) {
  const { encrypted, loading, storageConfigured } = useConfigForm()

  return (
    <>
      {!loading && !storageConfigured ? <Notice tone="danger">Connect Upstash Redis in the Vercel Marketplace to persist production configuration.</Notice> : null}
      {!loading && !encrypted ? <Notice tone="warning">Save any completed section to encrypt it now. Missing services can be configured later.</Notice> : null}

      {loading ? <ConfigContentSkeleton /> : children}
    </>
  )
}
