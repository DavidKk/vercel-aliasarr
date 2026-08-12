import { AliasarrConfigSchema, defaultAliasarrConfig } from '../../services/config'
import { createIndexerClient } from '../../services/indexers'

describe('unified indexer client', () => {
  it('queries only selected Jackett indexers when Prowlarr is not configured', async () => {
    const jackettSearch = jest.fn(async () => [])
    const config = defaultAliasarrConfig()
    config.indexers.jackett = { mode: 'selected', indexerIds: ['mikan', 'nyaasi'], languageOverrides: {} }
    const client = createIndexerClient({
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('\u5e86\u4f59\u5e74 S02E12', { categories: [5000, 5040], mediaType: 'series' })

    expect(jackettSearch).toHaveBeenCalledWith('\u5e86\u4f59\u5e74 S02E12', {
      categories: [5000, 5040],
      indexerIds: ['mikan', 'nyaasi'],
    })
  })

  it('aggregates Prowlarr and Jackett when both providers are enabled', async () => {
    const prowlarrSearch = jest.fn(async () => [{ guid: 'p', title: 'Prowlarr', originalTitle: 'Prowlarr', downloadUrl: 'https://p', categories: [2000] }])
    const jackettSearch = jest.fn(async () => [{ guid: 'j', title: 'Jackett', originalTitle: 'Jackett', downloadUrl: 'https://j', categories: [2000] }])
    const config = defaultAliasarrConfig()
    config.indexers.jackett = { mode: 'all', indexerIds: [], languageOverrides: {} }
    const client = createIndexerClient({
      prowlarr: { search: prowlarrSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      loadConfig: async () => ({ config, exists: true }),
    })

    const results = await client.search('Movie', { categories: [2000], mediaType: 'movie' })

    expect(results.map((result) => result.guid)).toEqual(['p', 'j'])
    expect(prowlarrSearch).toHaveBeenCalledWith('Movie', { categories: [2000], indexerIds: undefined })
    expect(jackettSearch).toHaveBeenCalledWith('Movie', { categories: [2000], indexerIds: undefined })
  })

  it('does not treat an empty selected list as all indexers', async () => {
    const prowlarrSearch = jest.fn(async () => [])
    const jackettSearch = jest.fn(async () => [])
    const config = defaultAliasarrConfig()
    config.indexers.prowlarr = { mode: 'selected', indexerIds: [], languageOverrides: {} }
    config.indexers.jackett = { mode: 'selected', indexerIds: [], languageOverrides: {} }
    const client = createIndexerClient({
      prowlarr: { search: prowlarrSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      loadConfig: async () => ({ config, exists: true }),
    })

    await expect(client.search('Movie', { categories: [2000], mediaType: 'movie' })).resolves.toEqual([])
    expect(prowlarrSearch).not.toHaveBeenCalled()
    expect(jackettSearch).not.toHaveBeenCalled()
  })

  it('defaults Jackett indexer mode to all enabled indexers', () => {
    expect(defaultAliasarrConfig().indexers.jackett).toEqual({ mode: 'all', indexerIds: [], languageOverrides: {} })
  })

  it('defaults search languages to all known options', () => {
    expect(defaultAliasarrConfig().indexers.languages).toEqual(['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'pt-BR', 'ru-RU', 'it-IT'])
    expect(defaultAliasarrConfig().indexers.prowlarr.languageOverrides).toEqual({})
  })

  it('rejects empty search languages on save', () => {
    const parsed = AliasarrConfigSchema.safeParse({
      ...defaultAliasarrConfig(),
      indexers: { ...defaultAliasarrConfig().indexers, languages: [] },
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.message).toMatch(/at least one search language/i)
    }
  })

  it('filters Prowlarr indexers by selected languages', async () => {
    const prowlarrSearch = jest.fn(async () => [])
    const listIndexers = jest.fn(async () => [
      { id: 1, name: 'Chinese Trackers', enable: true, language: 'zh-CN' },
      { id: 2, name: 'English Trackers', enable: true, language: 'en-US' },
      { id: 3, name: 'Unknown Trackers', enable: true },
    ])
    const config = defaultAliasarrConfig()
    config.indexers.languages = ['zh-CN']
    config.indexers.prowlarr = { mode: 'all', indexerIds: [], languageOverrides: {} }
    const client = createIndexerClient({
      prowlarr: { search: prowlarrSearch, ping: jest.fn(async () => true), listIndexers },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('Query', { categories: [5000], mediaType: 'series' })

    expect(listIndexers).toHaveBeenCalled()
    expect(prowlarrSearch).toHaveBeenCalledWith('Query', { categories: [5000], indexerIds: [1, 3] })
  })

  it('uses per-indexer language overrides when filtering', async () => {
    const prowlarrSearch = jest.fn(async () => [])
    const listIndexers = jest.fn(async () => [
      { id: 1, name: 'Mislabelled Chinese', enable: true, language: 'en-US' },
      { id: 2, name: 'English Trackers', enable: true, language: 'en-US' },
    ])
    const config = defaultAliasarrConfig()
    config.indexers.languages = ['zh-CN']
    config.indexers.prowlarr = { mode: 'all', indexerIds: [], languageOverrides: { '1': ['zh-CN'] } }
    const client = createIndexerClient({
      prowlarr: { search: prowlarrSearch, ping: jest.fn(async () => true), listIndexers },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('Query', { categories: [5000], mediaType: 'series' })

    expect(prowlarrSearch).toHaveBeenCalledWith('Query', { categories: [5000], indexerIds: [1] })
  })

  it('does not fan out Jackett when language filter has no overrides', async () => {
    const jackettSearch = jest.fn(async () => [])
    const listIndexers = jest.fn(async () => [
      { id: 'a', name: 'A', configured: true },
      { id: 'b', name: 'B', configured: true },
    ])
    const config = defaultAliasarrConfig()
    config.indexers.languages = ['zh-CN']
    config.indexers.jackett = { mode: 'all', indexerIds: [], languageOverrides: {} }
    const client = createIndexerClient({
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('Query', { categories: [5000], mediaType: 'series' })

    expect(listIndexers).not.toHaveBeenCalled()
    expect(jackettSearch).toHaveBeenCalledWith('Query', { categories: [5000], indexerIds: undefined })
  })

  it('applies Jackett language overrides without querying every indexer when nothing is excluded', async () => {
    const jackettSearch = jest.fn(async () => [])
    const listIndexers = jest.fn(async () => [
      { id: 'a', name: 'A', configured: true },
      { id: 'b', name: 'B', configured: true },
    ])
    const config = defaultAliasarrConfig()
    config.indexers.languages = ['zh-CN']
    config.indexers.jackett = { mode: 'all', indexerIds: [], languageOverrides: { a: ['zh-CN'] } }
    const client = createIndexerClient({
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('Query', { categories: [5000], mediaType: 'series' })

    expect(listIndexers).toHaveBeenCalled()
    // b has no override → unknown → kept; a matches → kept; equivalent to all
    expect(jackettSearch).toHaveBeenCalledWith('Query', { categories: [5000], indexerIds: undefined })
  })

  it('scopes search to a single Prowlarr indexer id', async () => {
    const prowlarrSearch = jest.fn(async () => [])
    const jackettSearch = jest.fn(async () => [])
    const config = defaultAliasarrConfig()
    const client = createIndexerClient({
      prowlarr: { search: prowlarrSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('Query', {
      categories: [5000],
      mediaType: 'series',
      scope: { provider: 'prowlarr', indexerId: '12' },
    })

    expect(prowlarrSearch).toHaveBeenCalledWith('Query', { categories: [5000], indexerIds: [12] })
    expect(jackettSearch).not.toHaveBeenCalled()
  })

  it('scopes search to a single Jackett indexer id', async () => {
    const prowlarrSearch = jest.fn(async () => [])
    const jackettSearch = jest.fn(async () => [])
    const config = defaultAliasarrConfig()
    const client = createIndexerClient({
      prowlarr: { search: prowlarrSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      jackett: { search: jackettSearch, ping: jest.fn(async () => true), listIndexers: jest.fn(async () => []) },
      loadConfig: async () => ({ config, exists: true }),
    })

    await client.search('Query', {
      categories: [2000],
      mediaType: 'movie',
      scope: { provider: 'jackett', indexerId: 'nyaa-si' },
    })

    expect(jackettSearch).toHaveBeenCalledWith('Query', { categories: [2000], indexerIds: ['nyaa-si'] })
    expect(prowlarrSearch).not.toHaveBeenCalled()
  })
})
