import type { MetadataRoute } from 'next'

import { resolveMetadataBase } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const base = resolveMetadataBase().origin
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs', '/docs/', '/login', '/api/health'],
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
