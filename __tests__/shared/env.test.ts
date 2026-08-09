import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getEnv', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('throws when TORZNAB_API_KEY is missing', async () => {
    vi.stubEnv('TORZNAB_API_KEY', '')
    vi.stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    vi.stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    const { getEnv } = await import('../../utils/env')
    expect(() => getEnv()).toThrow(/TORZNAB_API_KEY/)
  })
})
