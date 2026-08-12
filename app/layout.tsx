import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { IBM_Plex_Mono, Sora } from 'next/font/google'
import type { ReactNode } from 'react'

import { Providers } from '@/components/providers'
import { buildRootMetadata } from '@/lib/seo'

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = buildRootMetadata()

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout(props: Readonly<RootLayoutProps>) {
  const { children } = props

  return (
    <html lang="en" className="bg-app-bg">
      <Analytics />
      <SpeedInsights />
      <body className={`${sora.variable} ${ibmPlexMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
