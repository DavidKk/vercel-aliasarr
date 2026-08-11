import type { MediaIdentity } from '@/utils/types'

import type { MediaTitles, TitleAlias } from './media-schema'
import { toSimplified, toTraditional } from './script-convert'

export interface ResolvedTitles {
  titles: string[]
}

export interface ResolveOptions {
  maxTitles: number
  enableScriptConvert: boolean
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

export function resolveTitles(identity: MediaIdentity, media: MediaTitles | null, options: ResolveOptions): ResolvedTitles {
  const candidates: TitleAlias[] = []

  if (media) {
    candidates.push(...media.aliases)
    candidates.push({
      title: media.primaryTitle,
      type: 'official',
      script: 'latin',
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

  const seen = new Set<string>()
  const ordered: string[] = []

  const push = (title: string) => {
    const key = title.trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    ordered.push(key)
  }

  for (const alias of candidates) {
    push(alias.title)
  }

  if (options.enableScriptConvert) {
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
