import { logger } from '@/utils/logger'
import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles } from '../media-schema'
import type { AliasProvider, AliasProviderResult } from './types'

const BGM_BASE = 'https://api.bgm.tv'

async function bangumiSearch(keyword: string, token?: string): Promise<any | null> {
  const url = new URL(`${BGM_BASE}/search/subject/${encodeURIComponent(keyword)}`)
  url.searchParams.set('type', '2')
  url.searchParams.set('responseGroup', 'small')
  const headers: Record<string, string> = {
    'User-Agent': 'Aliasarr/0.1 (https://github.com/DavidKk/vercel-aliasarr)',
    Accept: 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    logger.warn({ status: res.status, keyword }, 'bangumi search failed')
    return null
  }
  return res.json()
}

export function createBangumiProvider(token?: string): AliasProvider {
  return {
    name: 'bangumi',
    async lookup(identity: MediaIdentity, hints?: { titles?: string[] }): Promise<AliasProviderResult> {
      const keyword = hints?.titles?.[0] || identity.primaryTitle
      if (!keyword) return { media: null, source: 'bangumi' }

      try {
        const data = await bangumiSearch(keyword, token)
        const first = data?.list?.[0]
        if (!first) return { media: null, source: 'bangumi' }

        const cn = first.name_cn || first.name
        if (!cn) return { media: null, source: 'bangumi' }

        const media: MediaTitles = {
          mediaId: `bangumi:${first.id}`,
          mediaType: identity.mediaType,
          primaryTitle: cn,
          originalLanguage: 'zh',
          aliases: [
            { title: cn, type: 'translation', script: 'simplified', priority: 98, verified: false },
            ...(first.name && first.name !== cn ? [{ title: first.name as string, type: 'official' as const, script: 'latin' as const, priority: 80, verified: false }] : []),
          ],
          updatedAt: new Date().toISOString(),
          tvdbId: identity.tvdbId,
          tmdbId: identity.tmdbId,
          imdbId: identity.imdbId,
          sources: ['bangumi'],
        }
        return { media, source: 'bangumi' }
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'bangumi provider error')
        return { media: null, source: 'bangumi' }
      }
    },
  }
}
