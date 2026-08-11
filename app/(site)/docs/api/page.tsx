import type { Metadata } from 'next'

import { MarkdownDoc } from '@/components/docs/MarkdownDoc'
import { PageHeader } from '@/components/site-chrome'
import { loadRepoMarkdown } from '@/lib/docs/loadDocMarkdown'

export const metadata: Metadata = {
  title: 'API',
  description: 'Aliasarr HTTP and Torznab API contract.',
}

export default async function DocsApiPage() {
  const apiMarkdown = await loadRepoMarkdown('docs/API.md')
  return (
    <>
      <PageHeader eyebrow="Reference" title="API" description="HTTP, Torznab, config, and aliases contracts from docs/API.md." />
      <section className="ui-panel ui-fade-up p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="ui-label">Source</p>
          <code className="font-mono text-[0.7rem] text-app-muted">docs/API.md</code>
        </div>
        <MarkdownDoc markdown={apiMarkdown} />
      </section>
    </>
  )
}
