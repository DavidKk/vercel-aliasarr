import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import { candidateGistPaths, createGistFileIfAbsent, fetchGist, readGistFile } from '@/services/gist'
import { logger } from '@/utils/logger'
import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles } from '../media-schema'
import { MediaFileSchema, parseMediaYaml } from '../media-schema'
import type { AliasProvider, AliasProviderResult } from './types'

interface GistProviderConfig {
  gistId: string
  gistToken: string
}

export function createGistYamlProvider(credentials?: GistProviderConfig): AliasProvider {
  return {
    name: 'gist',
    async lookup(identity: MediaIdentity): Promise<AliasProviderResult> {
      if (!credentials?.gistId || !credentials.gistToken) return { media: null, source: 'gist' }

      const creds = credentials
      const candidates = candidateGistPaths(identity)
      if (candidates.length === 0) return { media: null, source: 'gist' }

      try {
        const gist = await fetchGist(creds)
        for (const fileName of candidates) {
          if (!gist.files[fileName]) continue
          const content = await readGistFile({ ...creds, fileName }, { gist })
          const media = parseMediaYaml(parseYaml(content))
          if (!media) continue
          media.sources = ['gist']
          // bump verified aliases priority slightly for merge wins
          media.aliases = media.aliases.map((a) => (a.verified ? { ...a, priority: Math.max(a.priority, 120) } : a))
          return { media, source: 'gist' }
        }
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'gist provider error')
      }
      return { media: null, source: 'gist' }
    },
  }
}

function writeBackPath(identity: MediaIdentity, media: MediaTitles): string | null {
  return candidateGistPaths(identity)[0] ?? candidateGistPaths(media)[0] ?? null
}

export async function cacheMediaInGist(identity: MediaIdentity, media: MediaTitles, credentials?: GistProviderConfig): Promise<boolean> {
  if (!credentials?.gistId || !credentials.gistToken) return false

  const fileName = writeBackPath(identity, media)
  if (!fileName) return false

  try {
    const document = MediaFileSchema.parse({
      media: {
        mediaType: media.mediaType,
        tvdbId: media.tvdbId,
        tmdbId: media.tmdbId,
        imdbId: media.imdbId,
        primaryTitle: media.primaryTitle,
        originalLanguage: media.originalLanguage,
        aliases: media.aliases,
      },
    })
    const result = await createGistFileIfAbsent({
      gistId: credentials.gistId,
      gistToken: credentials.gistToken,
      fileName,
      content: stringifyYaml(document),
    })
    return result.created
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err), fileName }, 'gist write-back failed')
    return false
  }
}
