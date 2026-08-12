import type { ReactNode } from 'react'

import { DocsSidebar } from '@/components/docs/DocsSidebar'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <DocsSidebar />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
