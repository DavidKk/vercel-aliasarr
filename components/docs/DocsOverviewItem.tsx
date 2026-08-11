export function DocsOverviewItem({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="border border-app-border/80 bg-app-subtle/40 px-3 py-2.5">
      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-app-muted">{term}</dt>
      <dd className="mt-1 font-mono text-[0.8rem] text-app-ink">{detail}</dd>
    </div>
  )
}
