import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

const AliasSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['original', 'official', 'translation', 'romanized', 'site-alias', 'manual', 'generated']).default('manual'),
  script: z.enum(['simplified', 'traditional', 'latin', 'other']).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  priority: z.number().default(0),
  verified: z.boolean().default(false),
})

const MediaFileSchema = z.object({
  media: z.object({
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
  primaryTitle: string
  originalLanguage?: string
  aliases: TitleAlias[]
  updatedAt: string
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
}

export interface AliasRepository {
  findByTvdbId(id: number): MediaTitles | null
}

export async function loadAliasRepository(dir: string): Promise<AliasRepository> {
  const byTvdb = new Map<number, MediaTitles>()
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch {
    return {
      findByTvdbId: () => null,
    }
  }

  for (const name of entries) {
    if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue
    const raw = await readFile(path.join(dir, name), 'utf8')
    const parsed = MediaFileSchema.safeParse(parseYaml(raw))
    if (!parsed.success) continue
    const m = parsed.data.media
    if (m.tvdbId == null) continue
    byTvdb.set(m.tvdbId, {
      mediaId: `tvdb:${m.tvdbId}`,
      primaryTitle: m.primaryTitle,
      originalLanguage: m.originalLanguage,
      aliases: m.aliases,
      updatedAt: new Date().toISOString(),
      tvdbId: m.tvdbId,
      tmdbId: m.tmdbId,
      imdbId: m.imdbId,
    })
  }

  return {
    findByTvdbId(id: number) {
      return byTvdb.get(id) ?? null
    },
  }
}
