import {
  areAllIndexerLanguagesSelected,
  effectiveSearchLanguages,
  indexerLanguageAllowed,
  languageCodesMatch,
  normalizeLanguageCode,
  resolveIndexerLanguages,
  toIndexerLocale,
} from '../../services/indexers/languages'

describe('indexer language helpers', () => {
  it('normalizes locale tags to primary language', () => {
    expect(normalizeLanguageCode('zh-CN')).toBe('zh')
    expect(normalizeLanguageCode('en_US')).toBe('en')
  })

  it('canonicalizes to Prowlarr/TMDB-style locales', () => {
    expect(toIndexerLocale('en')).toBe('en-US')
    expect(toIndexerLocale('zh-CN')).toBe('zh-CN')
    expect(toIndexerLocale('en_us')).toBe('en-US')
  })

  it('matches selected language codes', () => {
    expect(languageCodesMatch('zh-CN', ['zh-CN', 'en-US'])).toBe(true)
    expect(languageCodesMatch('ja', ['zh-CN'])).toBe(false)
  })

  it('keeps unknown indexer languages when filtering', () => {
    expect(indexerLanguageAllowed(undefined, ['zh-CN'])).toBe(true)
    expect(indexerLanguageAllowed('en-US', ['zh-CN'])).toBe(false)
    expect(indexerLanguageAllowed('zh-TW', ['zh-CN'])).toBe(true)
  })

  it('prefers overrides over upstream defaults', () => {
    expect(resolveIndexerLanguages(['zh'], 'en-US')).toEqual(['zh-CN'])
    expect(resolveIndexerLanguages([], 'en-US')).toEqual(['en-US'])
    expect(resolveIndexerLanguages(undefined, 'zh-CN')).toEqual(['zh-CN'])
  })

  it('treats full default selection as unrestricted search languages', () => {
    expect(effectiveSearchLanguages(['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'pt-BR', 'ru-RU', 'it-IT'])).toEqual([])
    expect(effectiveSearchLanguages(['zh-CN', 'en-US'])).toEqual(['zh-CN', 'en-US'])
    expect(areAllIndexerLanguagesSelected(['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'pt-BR', 'ru-RU', 'it-IT'])).toBe(true)
  })
})
