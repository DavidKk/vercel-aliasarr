import type { MediaTitles } from '../../../services/media/media-schema'
import { resolveTitles } from '../../../services/media/title-resolver'

describe('resolveTitles', () => {
  it('prefers verified chinese aliases and caps to maxTitles', () => {
    const media: MediaTitles = {
      mediaId: 'tvdb:366625',
      mediaType: 'series',
      primaryTitle: 'Joy of Life',
      originalLanguage: 'zh',
      sources: ['gist'],
      aliases: [
        {
          title: '\u5e86\u4f59\u5e74',
          type: 'original',
          script: 'simplified',
          priority: 100,
          verified: true,
        },
        {
          title: '\u6176\u9918\u5e74',
          type: 'translation',
          script: 'traditional',
          priority: 90,
          verified: true,
        },
        {
          title: '\u5e86\u4f59\u5e742',
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
    expect(resolved.titles[0]).toBe('\u5e86\u4f59\u5e74')
  })

  it('falls back to primaryTitle when no alias media', () => {
    const resolved = resolveTitles({ mediaType: 'series', primaryTitle: 'Only English' }, null, { maxTitles: 3, enableScriptConvert: true })
    expect(resolved.titles).toEqual(['Only English'])
  })
})
