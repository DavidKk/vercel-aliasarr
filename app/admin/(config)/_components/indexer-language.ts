import { INDEXER_LANGUAGE_OPTIONS, normalizeLanguageCode, resolveIndexerLanguages } from '@/services/indexers/languages'

export const languageOptions = INDEXER_LANGUAGE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))

/** Map stored override / upstream locale onto the selectable option values. Empty = no selection. */
export function pickLanguageValues(override: string[] | undefined, upstream: string | undefined, options: Array<{ value: string }>): string[] {
  const resolved = resolveIndexerLanguages(override, upstream)
  const mapped = resolved
    .map((locale) => {
      const exact = options.find((option) => option.value === locale)
      if (exact) return exact.value
      const primary = normalizeLanguageCode(locale)
      return options.find((option) => normalizeLanguageCode(option.value) === primary)?.value
    })
    .filter((item): item is string => Boolean(item))
  return [...new Set(mapped)]
}
