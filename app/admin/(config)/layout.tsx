'use client'

import type { ReactNode } from 'react'

import { ConfigContentSkeleton } from '@/components/page-skeletons'
import { Skeleton } from '@/components/ui'

import { ConfigProvider, useConfigForm } from './_components/config-provider'
import { Notice, StatusPill } from './_components/ui'

export default function ConfigSectionLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ConfigShell>{children}</ConfigShell>
    </ConfigProvider>
  )
}

function ConfigShell({ children }: { children: ReactNode }) {
  const { encrypted, loading, storage, storageConfigured } = useConfigForm()

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {loading ? (
          <>
            <Skeleton className="h-6 w-24" rounded="full" />
            <Skeleton className="h-6 w-20" rounded="full" />
          </>
        ) : (
          <>
            <StatusPill ok={storageConfigured}>{storage === 'vercel-kv' ? 'Upstash Redis' : 'Local file'}</StatusPill>
            <StatusPill ok={encrypted}>{encrypted ? 'Encrypted' : 'Pending encryption'}</StatusPill>
          </>
        )}
      </div>

      {!loading && !storageConfigured ? <Notice tone="danger">Connect Upstash Redis in the Vercel Marketplace to persist production configuration.</Notice> : null}
      {!loading && !encrypted ? <Notice tone="warning">Save any completed section to encrypt it now. Missing services can be configured later.</Notice> : null}

      {loading ? <ConfigContentSkeleton /> : children}
    </>
  )
}
