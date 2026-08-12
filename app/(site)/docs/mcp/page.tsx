import type { Metadata } from 'next'
import Link from 'next/link'

import { MCP_TOOLS } from '@/components/docs/constants'
import { DocsOverviewItem } from '@/components/docs/DocsOverviewItem'
import { McpInstallPanel } from '@/components/docs/McpInstallPanel'
import { PageHeader } from '@/components/site-chrome'
import { resolveMetadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'MCP',
  description: 'Aliasarr HTTP MCP endpoint, one-click install, tools, and auth.',
}

export default function DocsMcpPage() {
  const mcpUrl = new URL('/api/mcp', resolveMetadataBase()).toString().replace(/\/$/, '')

  return (
    <>
      <PageHeader eyebrow="Protocol" title="MCP" description="HTTP MCP endpoint for tools and resources. Auth uses the Admin-configured Torznab API key." />

      <section className="ui-panel ui-fade-up mb-4 p-5">
        <h3 className="mb-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted">One-click install</h3>
        <p className="mb-4 text-sm leading-relaxed text-app-muted">
          Add Aliasarr to Cursor or VS Code in one click. Paste your Torznab API key first (Admin → Config), or install with a placeholder and replace it later. Full protocol notes
          also live under{' '}
          <Link href="/docs/skill" className="text-app-accent underline decoration-app-accent/40 underline-offset-2">
            Skill
          </Link>
          .
        </p>
        <McpInstallPanel mcpUrl={mcpUrl} />
      </section>

      <section className="ui-panel ui-fade-up p-5">
        <h3 className="mb-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted">Endpoint</h3>
        <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
          <DocsOverviewItem term="GET" detail="Manifest (tools + resources)" />
          <DocsOverviewItem term="POST" detail="JSON-RPC 2.0 or legacy { tool, params }" />
          <DocsOverviewItem term="Path" detail="GET|POST /api/mcp" />
        </dl>

        <h3 className="mb-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted">Auth</h3>
        <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-app-muted">
          <li>
            Header <code className="font-mono text-app-ink">x-api-key: &lt;ADMIN_CONFIGURED_TORZNAB_KEY&gt;</code>
          </li>
          <li>
            Or <code className="font-mono text-app-ink">Authorization: Bearer &lt;key&gt;</code>
          </li>
          <li>
            Or query <code className="font-mono text-app-ink">?apikey=&lt;key&gt;</code>
          </li>
        </ul>

        <h3 className="mb-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted">Methods</h3>
        <p className="mb-3 text-sm text-app-muted">
          JSON-RPC: <code className="font-mono text-app-ink">initialize</code>, <code className="font-mono text-app-ink">tools/list</code>,{' '}
          <code className="font-mono text-app-ink">tools/call</code>, <code className="font-mono text-app-ink">resources/list</code>,{' '}
          <code className="font-mono text-app-ink">resources/read</code>.
        </p>

        <h3 className="mb-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted">Tools</h3>
        <div className="mb-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-border font-mono text-[0.65rem] uppercase tracking-[0.14em] text-app-muted">
                <th className="py-2 pr-3 font-medium">Tool</th>
                <th className="py-2 font-medium">Use</th>
              </tr>
            </thead>
            <tbody>
              {MCP_TOOLS.map((tool) => (
                <tr key={tool.name} className="border-b border-app-border/70 align-top">
                  <td className="py-2.5 pr-3 font-mono text-[0.8rem] text-app-ink">{tool.name}</td>
                  <td className="py-2.5 text-app-muted">{tool.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-app-muted">Resources</h3>
        <p className="text-sm text-app-muted">
          <code className="font-mono text-app-ink">aliasarr://skills/mcp/SKILL.md</code> — see the Skill page.
        </p>
        <p className="mt-3 text-xs text-app-muted">MCP does not expose Gist YAML write tools — edit aliases via /login → /admin/aliases.</p>
      </section>
    </>
  )
}
