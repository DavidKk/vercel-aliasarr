describe('resolveJwtSecret', () => {
  afterEach(() => {
    jest.resetModules()
    unstubAllEnvs()
  })

  it('prefers JWT_SECRET over ACCESS_PASSWORD', async () => {
    stubEnv('JWT_SECRET', 'jwt-secret-value')
    stubEnv('ACCESS_PASSWORD', 'password-value')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const { resolveJwtSecret } = await import('../../utils/jwt')
    expect(resolveJwtSecret()).toBe('jwt-secret-value')
  })

  it('falls back to ACCESS_PASSWORD when JWT_SECRET is unset', async () => {
    stubEnv('JWT_SECRET', '')
    stubEnv('ACCESS_PASSWORD', 'password-value')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const { resolveJwtSecret } = await import('../../utils/jwt')
    expect(resolveJwtSecret()).toBe('password-value')
  })

  it('allows a dev-only hardcoded fallback outside production', async () => {
    stubEnv('NODE_ENV', 'test')
    stubEnv('JWT_SECRET', '')
    stubEnv('ACCESS_PASSWORD', '')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const { resolveJwtSecret } = await import('../../utils/jwt')
    expect(resolveJwtSecret()).toBe('aliasarr-default-jwt-secret')
  })

  it('rejects missing secrets in production', async () => {
    stubEnv('NODE_ENV', 'production')
    stubEnv('JWT_SECRET', '')
    stubEnv('ACCESS_PASSWORD', '')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const { resolveJwtSecret } = await import('../../utils/jwt')
    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET or ACCESS_PASSWORD/)
  })
})
