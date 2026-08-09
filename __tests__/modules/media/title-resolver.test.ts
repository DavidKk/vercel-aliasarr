import { describe, expect, it } from 'vitest'
import { resolveTitles } from '../../../services/media/title-resolver'
import type { MediaTitles } from '../../../services/media/alias-repository'

describe('resolveTitles', () => {
  it('prefers verified chinese aliases and caps to maxTitles', () => {
    const media: MediaTitles = {
      mediaId: 'tvdb:366625',
      primaryTitle: 'Joy of Life',
      originalLanguage: 'zh',
      aliases: [
        {
          title: '庆余年',
          type: 'original',
          script: 'simplified',
          priority: 100,
          verified: true,
        },
        {
          title: '慶餘年',
          type: 'translation',
          script: 'traditional',
          priority: 90,
          verified: true,
        },
        {
          title: '庆余年2',
          type: 'site-alias',
          script: 'simplified',
          priority: 80,
          verified: true,
        },
        {
          title: 'Joy of Life',
          type: 'official',
          script: 'latin',
          priority: 50,
          verified: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    }
    const resolved = resolveTitles({ mediaType: 'series', tvdbId: 366625, primaryTitle: 'Joy of Life' }, media, { maxTitles: 3, enableScriptConvert: true })
    expect(resolved.titles).toHaveLength(3)
    expect(resolved.titles[0]).toBe('庆余年')
  })

  it('falls back to primaryTitle when no alias media', () => {
    const resolved = resolveTitles({ mediaType: 'series', primaryTitle: 'Only English' }, null, { maxTitles: 3, enableScriptConvert: true })
    expect(resolved.titles).toEqual(['Only English'])
  })
})
