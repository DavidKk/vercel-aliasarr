/// <reference types="jest" />

import { pickLanguageValues } from '../../app/admin/(config)/_components/indexer-language'

describe('pickLanguageValues', () => {
  const options = [{ value: 'zh-CN' }, { value: 'en-US' }, { value: 'ja-JP' }]

  it('maps overrides onto option values', () => {
    expect(pickLanguageValues(['zh', 'en-US'], 'ja-JP', options)).toEqual(['zh-CN', 'en-US'])
  })

  it('falls back to upstream when override is empty', () => {
    expect(pickLanguageValues([], 'en', options)).toEqual(['en-US'])
    expect(pickLanguageValues(undefined, 'ja-JP', options)).toEqual(['ja-JP'])
  })

  it('returns empty when neither override nor upstream maps', () => {
    expect(pickLanguageValues(undefined, undefined, options)).toEqual([])
    expect(pickLanguageValues([], undefined, options)).toEqual([])
  })
})
