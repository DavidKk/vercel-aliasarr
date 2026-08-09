import Link from 'next/link'

import { HealthPanel } from '@/components/health-panel'
import { Shell, SiteNav } from '@/components/site-chrome'

export default function HomePage() {
  return (
    <Shell>
      <SiteNav active="home" />
      <section className="grid gap-4 py-8">
        <h1 className="text-[clamp(3rem,8vw,5rem)] font-semibold leading-none tracking-tight">Aliasarr</h1>
        <p className="max-w-xl text-lg leading-relaxed text-app-muted">
          部署在 Vercel 上的虚拟 Torznab Indexer。把 Sonarr 的英文标题 / TVDB ID 扩展为中文别名，再经 Prowlarr 搜索真实站点。
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/admin" className="inline-flex items-center rounded-full bg-app-text px-5 py-3 text-sm font-medium text-app-surface transition hover:-translate-y-px">
            打开试搜控制台
          </Link>
          <a href="/api/health" className="inline-flex items-center rounded-full border border-app-border px-5 py-3 text-sm font-medium transition hover:-translate-y-px">
            查看 Health JSON
          </a>
        </div>
      </section>

      <div className="grid gap-4">
        <HealthPanel />
        <section className="rounded-2xl border border-app-border bg-app-surface/80 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Sonarr 接入</h2>
          <ul className="grid gap-2 text-sm">
            <li className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
              <span className="text-app-muted">URL</span>
              <code className="rounded bg-app-accentSoft px-2 py-0.5 font-mono text-[0.85rem]">https://&lt;your-app&gt;.vercel.app</code>
            </li>
            <li className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
              <span className="text-app-muted">API Path</span>
              <code className="rounded bg-app-accentSoft px-2 py-0.5 font-mono text-[0.85rem]">/api/torznab</code>
            </li>
            <li className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
              <span className="text-app-muted">API Key</span>
              <code className="rounded bg-app-accentSoft px-2 py-0.5 font-mono text-[0.85rem]">TORZNAB_API_KEY</code>
            </li>
            <li className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
              <span className="text-app-muted">Categories</span>
              <code className="rounded bg-app-accentSoft px-2 py-0.5 font-mono text-[0.85rem]">5000, 5030, 5040, 5045</code>
            </li>
          </ul>
        </section>
      </div>
    </Shell>
  )
}
