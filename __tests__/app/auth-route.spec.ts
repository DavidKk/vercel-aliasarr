import { NextRequest } from 'next/server'

describe('POST /api/auth', () => {
  afterEach(() => {
    jest.resetModules()
    unstubAllEnvs()
    jest.restoreAllMocks()
  })

  async function post(body: unknown, cookie?: string) {
    const { POST } = await import('../../app/api/auth/route')
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (cookie) headers.set('cookie', cookie)
    const req = new NextRequest('http://localhost/api/auth', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return POST(req, { params: Promise.resolve({}) })
  }

  it('rejects missing credentials configuration', async () => {
    stubEnv('ACCESS_USERNAME', '')
    stubEnv('ACCESS_PASSWORD', '')
    stubEnv('JWT_SECRET', 'test-jwt-secret')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const res = await post({ username: 'a', password: 'b' })
    expect(res.status).toBe(400)
  })

  it('rejects invalid username/password', async () => {
    stubEnv('ACCESS_USERNAME', 'admin')
    stubEnv('ACCESS_PASSWORD', 'secret')
    stubEnv('JWT_SECRET', 'test-jwt-secret')
    stubEnv('ACCESS_2FA_SECRET', '')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const res = await post({ username: 'admin', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('signs in with username/password when 2FA is off', async () => {
    stubEnv('ACCESS_USERNAME', 'admin')
    stubEnv('ACCESS_PASSWORD', 'secret')
    stubEnv('JWT_SECRET', 'test-jwt-secret')
    stubEnv('ACCESS_2FA_SECRET', '')
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const res = await post({ username: 'admin', password: 'secret', rememberMe: true })
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') || ''
    expect(setCookie).toContain('auth_token=')
    const json = await res.json()
    expect(json.code).toBe(0)
  })

  it('requires TOTP when ACCESS_2FA_SECRET is set', async () => {
    const { authenticator } = await import('otplib')
    const secret = authenticator.generateSecret()
    stubEnv('ACCESS_USERNAME', 'admin')
    stubEnv('ACCESS_PASSWORD', 'secret')
    stubEnv('JWT_SECRET', 'test-jwt-secret')
    stubEnv('ACCESS_2FA_SECRET', secret)
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()

    const missing = await post({ username: 'admin', password: 'secret' })
    expect(missing.status).toBe(401)

    const token = authenticator.generate(secret)
    const ok = await post({ username: 'admin', password: 'secret', token })
    expect(ok.status).toBe(200)
  })

  it('completes Signet 2FA step-up with pending cookie', async () => {
    const { authenticator } = await import('otplib')
    const secret = authenticator.generateSecret()
    stubEnv('ACCESS_USERNAME', 'admin')
    stubEnv('ACCESS_PASSWORD', 'secret')
    stubEnv('JWT_SECRET', 'test-jwt-secret')
    stubEnv('ACCESS_2FA_SECRET', secret)
    const { resetEnvCache } = await import('../../utils/env')
    resetEnvCache()
    const { generateToken } = await import('../../utils/jwt')
    const { SIGNET_2FA_PENDING_COOKIE } = await import('../../services/auth/constants')
    const pending = await generateToken(
      {
        signetPending: true,
        provider: 'signet',
        username: 'admin',
        sub: 'admin-sub',
        rememberMe: true,
        nextPath: '/admin/probe',
      },
      '10m'
    )
    const token = authenticator.generate(secret)
    const res = await post({ signet2fa: true, token }, `${SIGNET_2FA_PENDING_COOKIE}=${pending}`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.redirectUrl).toBe('/admin/probe')
  })
})
