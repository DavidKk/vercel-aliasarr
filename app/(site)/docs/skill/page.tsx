import type { Metadata } from 'next'
import Link from 'next/link'

import { MarkdownDoc } from '@/components/docs/MarkdownDoc'
import { PageHeader } from '@/components/site-chrome'
import { loadRepoMarkdown } from '@/lib/docs/loadDocMarkdown'

export const metadata: Metadata = {
  title: 'Skill',
  description: 'Aliasarr agent Skill markdown for MCP and Cursor installs.',
}

export default async function DocsSkillPage() {
  const skillMarkdown = await loadRepoMarkdown('skills/aliasarr-mcp/SKILL.md')
  return (
    <>
      <PageHeader eyebrow="Agent document" title="Skill" description="Installable agent skill text. Also readable over MCP as aliasarr://skills/mcp/SKILL.md." />
      <section className="ui-panel ui-fade-up p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="ui-label">Source</p>
          <code className="font-mono text-[0.7rem] text-app-muted">skills/aliasarr-mcp/SKILL.md</code>
        </div>
        <p className="mb-4 text-sm text-app-muted">
          For the HTTP wire protocol, see{' '}
          <Link href="/docs/mcp" className="text-app-accent underline decoration-app-accent/40 underline-offset-2">
            MCP
          </Link>
          .
        </p>
        <MarkdownDoc markdown={skillMarkdown} />
      </section>
    </>
  )
}
