'use client'

import { Button } from '@/components/ui'

import { type ConfigSection, useConfigForm } from './config-provider'

export function PageSaveBar({ section }: { section: ConfigSection }) {
  const { loading, save, saving, storageConfigured } = useConfigForm()

  return (
    <footer className="mt-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 border-t border-app-border/70 pt-4">
      <p className="text-xs text-app-muted">Changes are encrypted before they are stored.</p>
      <Button onClick={() => void save(section)} disabled={saving || loading || !storageConfigured}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </footer>
  )
}
