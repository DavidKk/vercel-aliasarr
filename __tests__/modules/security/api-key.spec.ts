describe('assertTorznabApiKey', () => {
  beforeEach(() => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
  })
  afterEach(() => {
    jest.resetModules()
    unstubAllEnvs()
  })

  it('accepts matching key', async () => {
    const { resetEnvCache } = await import('../../../utils/env')
    resetEnvCache()
    const { assertTorznabApiKey } = await import('../../../services/security/api-key')
    expect(() => assertTorznabApiKey('0123456789abcdef', '0123456789abcdef')).not.toThrow()
  })

  it('rejects wrong key', async () => {
    const { resetEnvCache } = await import('../../../utils/env')
    resetEnvCache()
    const { assertTorznabApiKey, UnauthorizedError } = await import('../../../services/security/api-key')
    expect(() => assertTorznabApiKey('wrong-key-wrong!!', '0123456789abcdef')).toThrow(UnauthorizedError)
  })
})
