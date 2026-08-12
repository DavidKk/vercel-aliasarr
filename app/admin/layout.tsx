import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AdminChrome } from '@/components/admin-chrome'
import { checkAccess, getAuthUser } from '@/services/auth/access'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await checkAccess({ redirectUrl: '/admin', isApiRouter: false })
  const user = await getAuthUser()

  return <AdminChrome username={user?.username}>{children}</AdminChrome>
}
