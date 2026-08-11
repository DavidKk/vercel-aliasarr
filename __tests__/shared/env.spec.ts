describe('getEnv', () => {
  afterEach(() => {
    jest.resetModules()
    unstubAllEnvs()
  })

  it('allows integration credentials to be absent before encrypted configuration is created', async () => {
    stubEnv('TORZNAB_API_KEY', '')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { getEnv } = await import('../../utils/env')
    expect('TORZNAB_API_KEY' in getEnv()).toBe(false)
  })

  it('parses and deduplicates Prowlarr indexer allowlists', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    stubEnv('PROWLARR_INDEXER_IDS', '4, 10,4')
    stubEnv('PROWLARR_TV_INDEXER_IDS', '13,28')
    const { getEnv } = await import('../../utils/env')

    const env = getEnv()
    expect(env.PROWLARR_INDEXER_IDS).toEqual([4, 10])
    expect(env.PROWLARR_TV_INDEXER_IDS).toEqual([13, 28])
    expect(env.PROWLARR_MOVIE_INDEXER_IDS).toBeUndefined()
  })
})
