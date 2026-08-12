export function LoginHero() {
  return (
    <div className="ui-fade-up hidden max-w-xl lg:block">
      <span className="mb-5 inline-flex rounded-full border border-app-border bg-app-surface/70 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-app-accent">
        Protected workspace
      </span>
      <h1 className="font-display text-6xl font-semibold leading-[0.95] tracking-[-0.055em] text-app-ink">
        Your aliases,
        <br />
        under control.
      </h1>
      <p className="mt-6 max-w-md text-base leading-7 text-app-muted">
        Sign in to manage the title map that powers every expanded search. Browser access is isolated from machine API credentials.
      </p>
      <div className="mt-10 flex gap-8 border-t border-app-border/70 pt-6">
        <LoginFeature title="Session secured" detail="Signed cookie access" />
        <LoginFeature title="Optional 2FA" detail="Covers password and Signet" />
      </div>
    </div>
  )
}

function LoginFeature({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-app-ink">{title}</p>
      <p className="mt-1 text-xs text-app-muted">{detail}</p>
    </div>
  )
}
