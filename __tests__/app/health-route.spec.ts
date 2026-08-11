import { NextRequest } from 'next/server'

import { GET } from '../../app/api/health/route'
import { resetEnvCache } from '../../utils/env'

describe('health route', () => {
  afterEach(() => {
    unstubAllEnvs()
    unstubAllGlobals()
    resetEnvCache()
  })

  it('keeps the domain status field without treating it as an HTTP status code', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response(null, { status: 200 }))
    )
    resetEnvCache()

    const response = await GET(new NextRequest('http://localhost/api/health'), { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
  })
})
