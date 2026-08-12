import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  density = 'site',
}: {
  eyebrow?: string
  title: string
  description?: string
  status?: ReactNode
  density?: 'site' | 'admin' | 'config'
}) {
  const meta =
    eyebrow || status ? (
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {eyebrow ? <p className="ui-label">{eyebrow}</p> : null}
        {status ? <div className="ml-auto flex items-center">{status}</div> : null}
      </div>
    ) : null

  if (density === 'config') {
    return (
      <header className="mb-6">
        {meta}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-app-ink">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-app-muted">{description}</p> : null}
      </header>
    )
  }

  if (density === 'admin') {
    return (
      <header className="mb-8 border-b border-app-border/70 pb-6">
        {meta}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-app-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">{description}</p> : null}
      </header>
    )
  }

  return (
    <header className="ui-fade-up mb-9 max-w-3xl">
      {eyebrow ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-app-accent shadow-[0_0_18px_rgb(var(--app-accent))]" />
          <p className="font-mono text-[0.66rem] font-medium uppercase tracking-[0.2em] text-app-accent">{eyebrow}</p>
        </div>
      ) : null}
      <h1 className="font-display text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-app-ink">{title}</h1>
      {description ? <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-app-muted">{description}</p> : null}
    </header>
  )
}
