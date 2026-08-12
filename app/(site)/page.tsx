import type { Metadata } from 'next'
import { FiArrowRight } from 'react-icons/fi'

import { HealthPanel } from '@/components/health-panel'
import { StatusDot } from '@/components/status-dot'
import { ButtonLink } from '@/components/ui'
import { siteDescription } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Aliasarr — Find every title',
  description: siteDescription,
  alternates: { canonical: '/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Aliasarr',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: siteDescription,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

const features = [
  {
    number: '01',
    title: 'Alias intelligence',
    copy: 'Expand Simplified, Traditional, English, and original titles into smarter searches.',
  },
  {
    number: '02',
    title: 'Prowlarr native',
    copy: 'Fan every query through your existing indexers, then rank and deduplicate the result set.',
  },
  {
    number: '03',
    title: 'Arr compatible',
    copy: 'Return clean Torznab XML that Sonarr and Radarr understand without custom clients.',
  },
] as const

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative mb-16 grid items-center gap-12 py-4 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
        <div>
          <div className="ui-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-app-border bg-app-surface/75 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-app-muted">
            <StatusDot tone="success" />
            Built for Sonarr · Radarr · Prowlarr
          </div>
          <h1 className="ui-brand-mark max-w-3xl font-display text-[clamp(3.6rem,10vw,7.2rem)] font-semibold leading-[0.86] tracking-[-0.055em] text-app-ink">
            Find every
            <span className="block text-app-accent">title.</span>
          </h1>
          <p className="ui-fade-up-delay mt-7 max-w-xl text-base leading-7 text-app-muted sm:text-lg sm:leading-8">
            Aliasarr bridges Chinese media metadata and your automation stack, so one title becomes every title your indexers can discover.
          </p>
          <div className="ui-fade-up-delay mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/login">
              Administrator sign in
              <FiArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/docs" variant="ghost">
              Read the docs
            </ButtonLink>
          </div>
        </div>

        <div className="ui-fade-up-delay relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 -z-10 rounded-full bg-app-accent/10 blur-3xl" />
          <div className="ui-panel overflow-hidden p-3">
            <div className="flex items-center justify-between border-b border-app-border/70 px-3 pb-3 pt-1">
              <span className="ui-section-title">Live query expansion</span>
              <span className="flex items-center gap-1.5 text-xs text-app-success">
                <span className="h-1.5 w-1.5 rounded-full bg-app-success" /> Online
              </span>
            </div>
            <div className="space-y-2 p-3">
              <QueryRow label="Input" value="One Piece" tone="accent" />
              <div className="ml-5 h-5 border-l border-dashed border-app-border" />
              <QueryRow label="Aliases" value="ONE PIECE · ワンピース · Pirate King" />
              <div className="ml-5 h-5 border-l border-dashed border-app-border" />
              <QueryRow label="Output" value="18 unique releases" tone="success" />
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-app-border/70">
              <MiniMetric label="Latency" value="284ms" />
              <MiniMetric label="Sources" value="4" />
              <MiniMetric label="Match" value="98%" />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.number} className="ui-panel group p-6 transition duration-300 hover:-translate-y-1 hover:border-app-muted/70">
            <span className="font-mono text-[0.65rem] text-app-accent">{feature.number}</span>
            <h2 className="mt-8 text-lg font-semibold tracking-tight text-app-ink">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-app-muted">{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <HealthPanel />
        <div className="ui-panel p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="ui-section-title">Quick connect</h2>
            <span className="rounded-full bg-app-successSoft px-2.5 py-1 text-[0.68rem] font-medium text-app-success">3 steps</span>
          </div>
          <ol className="space-y-5">
            <SetupStep number="1" title="Add a custom indexer" detail="Choose Generic Torznab in Prowlarr." />
            <SetupStep number="2" title="Set the endpoint" detail="URL: https://<your-app>.vercel.app/api/torznab · API Path: /api" code />
            <SetupStep number="3" title="Add your API key" detail="Use the Torznab key configured in Admin." />
          </ol>
        </div>
      </section>
    </>
  )
}

function QueryRow({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'success' }) {
  const toneClass = tone === 'accent' ? 'text-app-accent' : tone === 'success' ? 'text-app-success' : 'text-app-ink'
  return (
    <div className="rounded-xl border border-app-border/70 bg-app-bg/55 p-4">
      <span className="ui-label block">{label}</span>
      <span className={`mt-2 block font-mono text-sm ${toneClass}`}>{value}</span>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-app-bg/70 px-3 py-3 text-center">
      <span className="block text-sm font-semibold text-app-ink">{value}</span>
      <span className="mt-1 block text-[0.62rem] text-app-muted">{label}</span>
    </div>
  )
}

function SetupStep({ number, title, detail, code }: { number: string; title: string; detail: string; code?: boolean }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-app-border bg-app-subtle font-mono text-xs text-app-accent">{number}</span>
      <div>
        <h3 className="text-sm font-semibold text-app-ink">{title}</h3>
        <p className={`mt-1 text-xs leading-5 text-app-muted ${code ? 'break-all font-mono' : ''}`}>{detail}</p>
      </div>
    </li>
  )
}
