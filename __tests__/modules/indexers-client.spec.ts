import { defaultAliasarrConfig } from '../../services/config'
import { createIndexerClient } from '../../services/indexers'

describe('unified indexer client', () => {
  it('queries only selected Jackett indexers when Prowlarr is not configured', async () => {
    const jackettSearch = jest.fn(async () => [])
    const config = defaultAliasarrConfig()
    config.indexers.jackett = { mode: 'selected', indexerIds: ['mikan', 'nyaasi'] }
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
    config.indexers.jackett = { mode: 'all', indexerIds: [] }
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
    config.indexers.prowlarr = { mode: 'selected', indexerIds: [] }
    config.indexers.jackett = { mode: 'selected', indexerIds: [] }
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
    expect(defaultAliasarrConfig().indexers.jackett).toEqual({ mode: 'all', indexerIds: [] })
  })
})
