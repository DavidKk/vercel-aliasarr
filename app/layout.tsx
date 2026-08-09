import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Aliasarr',
  description: 'Vercel Torznab alias indexer for Sonarr Chinese title search',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout(props: Readonly<RootLayoutProps>) {
  const { children } = props

  return (
    <html lang="zh-CN">
      <Analytics />
      <SpeedInsights />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
