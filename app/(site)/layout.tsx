import type { ReactNode } from 'react'

import { Shell, SiteNav } from '@/components/site-chrome'

export default function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <Shell>
      <SiteNav />
      {children}
    </Shell>
  )
}
