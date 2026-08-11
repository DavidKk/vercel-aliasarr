import type { ReactNode } from 'react'

export function AdminStack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 ${className}`}>{children}</div>
}

export function AdminCard({ children, className = '', padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <section className={`ui-panel min-w-0 ${padded ? 'p-5' : ''} ${className}`}>{children}</section>
}

export function AdminCardHeader({ title, detail, status }: { title: string; detail: string; status?: ReactNode }) {
  return (
    <div className="mb-5 flex min-h-14 items-start justify-between gap-4 border-b border-app-border/70 pb-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-app-ink">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-app-muted">{detail}</p>
      </div>
      {status}
    </div>
  )
}
