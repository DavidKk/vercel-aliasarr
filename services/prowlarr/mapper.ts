import type { SearchResult } from '@/services/search/types'

import type { ProwlarrRelease } from './types'

export interface MapOptions {
  sonarrBaseUrl?: string
  upstreamBaseUrl?: string
}

function rewriteDownloadUrl(url: string, opts: MapOptions | undefined): string {
  if (!opts?.sonarrBaseUrl || !opts.upstreamBaseUrl) return url
  try {
    const original = new URL(url)
    const upstream = new URL(opts.upstreamBaseUrl)
    if (original.origin !== upstream.origin) return url
    const sonarr = new URL(opts.sonarrBaseUrl)
    original.protocol = sonarr.protocol
    original.host = sonarr.host
    return original.toString()
  } catch {
    return url
  }
}

function categoryIds(raw: ProwlarrRelease['categories']): number[] {
  if (!raw) return []
  return raw.map((c) => (typeof c === 'number' ? c : c.id)).filter(Number.isFinite)
}

export function mapProwlarrRelease(raw: ProwlarrRelease, opts?: MapOptions): SearchResult {
  const title = raw.title ?? 'unknown'
  const downloadUrl = rewriteDownloadUrl(raw.downloadUrl ?? raw.magnetUrl ?? '', opts)
  return {
    guid: raw.guid ?? (downloadUrl || title),
    title,
    originalTitle: title,
    indexerId: raw.indexerId,
    indexerName: raw.indexer,
    infoUrl: raw.infoUrl,
    downloadUrl,
    infoHash: raw.infoHash,
    size: raw.size,
    seeders: raw.seeders,
    leechers: raw.leechers,
    peers: raw.peers ?? (raw.seeders != null && raw.leechers != null ? raw.seeders + raw.leechers : undefined),
    publishDate: raw.publishDate,
    categories: categoryIds(raw.categories),
    protocol: raw.protocol === 'usenet' ? 'usenet' : 'torrent',
  }
}
