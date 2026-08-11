import { languageCodesMatch, normalizeLanguageCode } from '@/services/indexers/languages'
import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles, TitleAlias } from './media-schema'
import { toSimplified, toTraditional } from './script-convert'

export interface ResolvedTitles {
  titles: string[]
}

export interface ResolveOptions {
  maxTitles: number
  enableScriptConvert: boolean
  /** Empty / omitted = keep all languages. */
  languages?: string[]
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

function hasJapanese(text: string): boolean {
  return /[\u3040-\u30ff]/.test(text)
}

function hasKorean(text: string): boolean {
  return /[\uac00-\ud7af]/.test(text)
}

export function inferTitleLanguage(title: string, alias?: Pick<TitleAlias, 'language' | 'script'>): string | undefined {
  if (alias?.language) return normalizeLanguageCode(alias.language)
  if (alias?.script === 'simplified' || alias?.script === 'traditional') return 'zh'
  if (hasChinese(title)) return 'zh'
  if (hasJapanese(title)) return 'ja'
  if (hasKorean(title)) return 'ko'
  if (/^[a-z0-9\s\-:'".,!?&+/()[\]]+$/i.test(title.trim())) return 'en'
  return undefined
}

function aliasAllowed(title: string, alias: TitleAlias | undefined, languages: string[]): boolean {
  if (!languages.length) return true
  const inferred = inferTitleLanguage(title, alias)
  if (!inferred) return true
  return languageCodesMatch(inferred, languages)
}

export function resolveTitles(identity: MediaIdentity, media: MediaTitles | null, options: ResolveOptions): ResolvedTitles {
  const languages = options.languages?.map(normalizeLanguageCode).filter(Boolean) ?? []
  const candidates: TitleAlias[] = []

  if (media) {
    candidates.push(...media.aliases)
    candidates.push({
      title: media.primaryTitle,
      type: 'official',
      script: 'latin',
      // Prefer script/heuristics over originalLanguage so latin primary titles stay English.
      language: inferTitleLanguage(media.primaryTitle) ?? media.originalLanguage,
      priority: 40,
      verified: true,
    })
  } else if (identity.primaryTitle) {
    candidates.push({
      title: identity.primaryTitle,
      type: 'official',
      script: 'latin',
      priority: 40,
      verified: true,
    })
  }

  candidates.sort((a, b) => b.priority - a.priority)

  const filtered = languages.length ? candidates.filter((alias) => aliasAllowed(alias.title, alias, languages)) : candidates
  const working = filtered

  const seen = new Set<string>()
  const ordered: string[] = []

  const push = (title: string) => {
    const key = title.trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    ordered.push(key)
  }

  for (const alias of working) {
    push(alias.title)
  }

  if (options.enableScriptConvert && (!languages.length || languages.some((code) => normalizeLanguageCode(code) === 'zh'))) {
    const extras: string[] = []
    for (const title of ordered) {
      if (!hasChinese(title)) continue
      extras.push(toTraditional(title), toSimplified(title))
    }
    for (const title of extras) {
      push(title)
    }
  }

  return { titles: ordered.slice(0, options.maxTitles) }
}
