/** Normalize BCP-47 / locale tags to a primary language code (`zh-CN` → `zh`). */
export function normalizeLanguageCode(code: string | undefined | null): string {
  if (!code) return ''
  return code.trim().toLowerCase().split(/[-_]/)[0] ?? ''
}

/** Locale tags aligned with Prowlarr indexer Language + TMDB request locales. */
export const INDEXER_LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: 'zh-CN' },
  { value: 'en-US', label: 'en-US' },
  { value: 'ja-JP', label: 'ja-JP' },
  { value: 'ko-KR', label: 'ko-KR' },
  { value: 'fr-FR', label: 'fr-FR' },
  { value: 'de-DE', label: 'de-DE' },
  { value: 'es-ES', label: 'es-ES' },
  { value: 'pt-BR', label: 'pt-BR' },
  { value: 'ru-RU', label: 'ru-RU' },
  { value: 'it-IT', label: 'it-IT' },
] as const

export type IndexerLanguageCode = (typeof INDEXER_LANGUAGE_OPTIONS)[number]['value']

export const DEFAULT_INDEXER_LANGUAGES: string[] = INDEXER_LANGUAGE_OPTIONS.map((option) => option.value)

const PRIMARY_TO_LOCALE: Record<string, string> = Object.fromEntries(INDEXER_LANGUAGE_OPTIONS.map((option) => [normalizeLanguageCode(option.value), option.value]))

/** Prefer canonical locale (`en` / `en_us` → `en-US`). Unknown primaries stay as trimmed input. */
export function toIndexerLocale(code: string | undefined | null): string {
  if (!code?.trim()) return ''
  const trimmed = code.trim().replace('_', '-')
  const primary = normalizeLanguageCode(trimmed)
  if (!primary) return ''
  if (trimmed.includes('-')) {
    const region = trimmed.split('-')[1]
    if (region) return `${primary}-${region.toUpperCase()}`
  }
  return PRIMARY_TO_LOCALE[primary] ?? trimmed
}

export function canonicalizeIndexerLanguages(selected: string[] | undefined | null): string[] {
  const next = [...new Set((selected ?? []).map(toIndexerLocale).filter(Boolean))]
  return next.length ? next : [...DEFAULT_INDEXER_LANGUAGES]
}

/** When every known option is selected (or list is empty legacy), treat as unrestricted. */
export function effectiveSearchLanguages(selected: string[] | undefined | null): string[] {
  const locales = canonicalizeIndexerLanguages(selected)
  const normalizedPrimaries = [...new Set(locales.map(normalizeLanguageCode).filter(Boolean))]
  if (!normalizedPrimaries.length) return []
  const defaults = DEFAULT_INDEXER_LANGUAGES.map(normalizeLanguageCode)
  if (defaults.every((code) => normalizedPrimaries.includes(code))) return []
  return locales
}

export function areAllIndexerLanguagesSelected(selected: string[] | undefined | null): boolean {
  const normalized = new Set(canonicalizeIndexerLanguages(selected).map(normalizeLanguageCode))
  return DEFAULT_INDEXER_LANGUAGES.every((code) => normalized.has(normalizeLanguageCode(code)))
}

export function languageCodesMatch(candidate: string | undefined | null, selected: string[]): boolean {
  if (!selected.length) return true
  const normalized = normalizeLanguageCode(candidate)
  if (!normalized) return false
  return selected.some((code) => normalizeLanguageCode(code) === normalized)
}

/** Effective indexer languages: explicit overrides win, otherwise the upstream default. */
export function resolveIndexerLanguages(override: string[] | string | undefined | null, fallback: string | undefined | null): string[] {
  if (Array.isArray(override)) {
    const locales = [...new Set(override.map(toIndexerLocale).filter(Boolean))]
    if (locales.length) return locales
  } else if (typeof override === 'string' && override.trim()) {
    const locale = toIndexerLocale(override)
    if (locale) return [locale]
  }
  const fromFallback = toIndexerLocale(fallback)
  return fromFallback ? [fromFallback] : []
}

/** @deprecated Prefer resolveIndexerLanguages for multi-select overrides. */
export function resolveIndexerLanguage(override: string | undefined | null, fallback: string | undefined | null): string {
  return resolveIndexerLanguages(override, fallback)[0] ?? ''
}

/** Keep indexers with unknown language when filtering, so we do not over-drop sources. */
export function indexerLanguageAllowed(indexerLanguage: string | undefined | null, selected: string[]): boolean {
  if (!selected.length) return true
  if (!indexerLanguage?.trim()) return true
  return languageCodesMatch(indexerLanguage, selected)
}

/** True when any resolved indexer language matches the allowlist (or language is unknown). */
export function indexerLanguagesAllowed(indexerLanguages: string[], selected: string[]): boolean {
  if (!selected.length) return true
  if (!indexerLanguages.length) return true
  return indexerLanguages.some((language) => languageCodesMatch(language, selected))
}
