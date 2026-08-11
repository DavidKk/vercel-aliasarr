export function StatusDot({ tone = 'success', label, className = '' }: { tone?: 'success' | 'danger' | 'muted'; label?: string; className?: string }) {
  const color = tone === 'danger' ? 'bg-app-danger' : tone === 'muted' ? 'bg-app-muted' : 'bg-app-success'
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label ? <span>{label}</span> : null}
    </span>
  )
}
