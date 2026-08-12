describe('Signet access policy', () => {
  afterEach(() => {
    jest.resetModules()
    unstubAllEnvs()
  })

  it('allows ACCESS_USERNAME by default', async () => {
    stubEnv('ACCESS_USERNAME', 'admin')
    stubEnv('SIGNET_ALLOWED_USERS', '')
    const { isSignetUserAllowed } = await import('../../services/auth/signet-sdk')
    expect(isSignetUserAllowed({ username: 'admin' })).toBe(true)
    expect(isSignetUserAllowed({ username: 'other' })).toBe(false)
  })

  it('uses SIGNET_ALLOWED_USERS when configured', async () => {
    stubEnv('ACCESS_USERNAME', 'admin')
    stubEnv('SIGNET_ALLOWED_USERS', 'alice, bob-sub')
    const { isSignetUserAllowed } = await import('../../services/auth/signet-sdk')
    expect(isSignetUserAllowed({ username: 'Alice' })).toBe(true)
    expect(isSignetUserAllowed({ username: 'x', sub: 'bob-sub' })).toBe(true)
    expect(isSignetUserAllowed({ username: 'admin' })).toBe(false)
  })

  it('refuses open Signet admin when no allowlist binding exists', async () => {
    stubEnv('ACCESS_USERNAME', '')
    stubEnv('SIGNET_ALLOWED_USERS', '')
    const { isSignetUserAllowed } = await import('../../services/auth/signet-sdk')
    expect(isSignetUserAllowed({ username: 'anyone' })).toBe(false)
  })

  it('keeps Signet available when local 2FA is enabled (step-up path)', async () => {
    stubEnv('ACCESS_2FA_SECRET', 'JBSWY3DPEHPK3PXP')
    stubEnv('SIGNET_SDK_URL', 'https://signet.example/sdk/signet-client.mjs')
    const { isLocal2faEnabled, isSignetLoginAvailable, isSignetPendingClaims } = await import('../../services/auth/signet-sdk')
    expect(isLocal2faEnabled()).toBe(true)
    expect(isSignetLoginAvailable()).toBe(true)
    expect(
      isSignetPendingClaims({
        signetPending: true,
        provider: 'signet',
        username: 'admin',
        sub: 'admin',
        rememberMe: true,
        nextPath: '/admin',
      })
    ).toBe(true)
    expect(isSignetPendingClaims({ authenticated: true })).toBe(false)
  })
})
