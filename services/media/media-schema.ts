import { z } from 'zod'

import type { MediaType } from '@/utils/types'

export const AliasSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['original', 'official', 'translation', 'romanized', 'site-alias', 'manual', 'generated']).default('manual'),
  script: z.enum(['simplified', 'traditional', 'latin', 'other']).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  priority: z.number().default(0),
  verified: z.boolean().default(false),
})

export const MediaFileSchema = z.object({
  media: z.object({
    mediaType: z.enum(['series', 'movie']).optional(),
    tvdbId: z.number().optional(),
    tmdbId: z.number().optional(),
    imdbId: z.string().optional(),
    primaryTitle: z.string().min(1),
    originalLanguage: z.string().optional(),
    aliases: z.array(AliasSchema).default([]),
  }),
})

export type TitleAlias = z.infer<typeof AliasSchema>

export interface MediaTitles {
  mediaId: string
  mediaType: MediaType
  primaryTitle: string
  originalLanguage?: string
  aliases: TitleAlias[]
  updatedAt: string
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  sources: string[]
}

export function hasChineseTitle(media: MediaTitles | null | undefined): boolean {
  if (!media) return false
  if (/[\u4e00-\u9fff]/.test(media.primaryTitle)) return true
  return media.aliases.some((a) => /[\u4e00-\u9fff]/.test(a.title))
}

export function parseMediaYaml(raw: unknown): MediaTitles | null {
  const parsed = MediaFileSchema.safeParse(raw)
  if (!parsed.success) return null
  const m = parsed.data.media
  const mediaType: MediaType = m.mediaType ?? (m.tvdbId != null ? 'series' : 'movie')
  const mediaId =
    mediaType === 'series'
      ? m.tvdbId != null
        ? `tvdb:${m.tvdbId}`
        : m.tmdbId != null
          ? `tmdb-tv:${m.tmdbId}`
          : `title:${m.primaryTitle}`
      : m.tmdbId != null
        ? `tmdb:${m.tmdbId}`
        : m.imdbId
          ? `imdb:${m.imdbId}`
          : `title:${m.primaryTitle}`

  return {
    mediaId,
    mediaType,
    primaryTitle: m.primaryTitle,
    originalLanguage: m.originalLanguage,
    aliases: m.aliases,
    updatedAt: new Date().toISOString(),
    tvdbId: m.tvdbId,
    tmdbId: m.tmdbId,
    imdbId: m.imdbId,
    sources: [],
  }
}
