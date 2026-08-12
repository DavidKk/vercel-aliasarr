import type { Metadata } from 'next'

export function resolveMetadataBase(): URL {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (production) return new URL(`https://${production}`)
  const vercel = process.env.VERCEL_URL
  if (vercel) return new URL(`https://${vercel}`)
  return new URL('http://localhost:3000')
}

export const siteDescription = 'A media alias engine for smarter Sonarr, Radarr, and Prowlarr searches.'

export function buildRootMetadata(): Metadata {
  const title = 'Aliasarr — Find every title'
  return {
    metadataBase: resolveMetadataBase(),
    title: { default: title, template: '%s · Aliasarr' },
    description: siteDescription,
    applicationName: 'Aliasarr',
    icons: {
      icon: [{ url: '/logo.png' }],
      apple: [{ url: '/logo.png' }],
    },
    openGraph: {
      type: 'website',
      siteName: 'Aliasarr',
      title,
      description: siteDescription,
      images: [{ url: '/logo.png', width: 1024, height: 682, alt: 'Aliasarr' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: siteDescription,
      images: ['/logo.png'],
    },
  }
}
