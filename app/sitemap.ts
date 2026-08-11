import type { MetadataRoute } from 'next'

import { resolveMetadataBase } from '@/lib/seo'

const PATHS = ['/', '/docs', '/docs/api', '/docs/mcp', '/docs/skill', '/login'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveMetadataBase().origin
  const now = new Date()
  return PATHS.map((path) => ({
    url: `${base}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: path.startsWith('/docs') ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/docs') ? 0.8 : 0.5,
  }))
}
