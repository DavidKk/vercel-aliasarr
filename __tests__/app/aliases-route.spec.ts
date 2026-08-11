import { NextRequest } from 'next/server'

jest.mock('../../services/auth/access', () => ({
  validateCookie: jest.fn(async () => false),
}))

jest.mock('../../services/config', () => ({
  loadAliasarrConfig: jest.fn(async () => ({
    config: { connections: { gistId: '' }, indexers: { prowlarr: { mode: 'all', indexerIds: [] }, jackett: { mode: 'all', indexerIds: [] } }, version: 1 },
    secrets: { gistToken: '', torznabApiKey: '' },
    exists: true,
    revision: 'r1',
  })),
}))

describe('aliases route auth', () => {
  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('rejects unauthenticated list requests', async () => {
    const { GET } = await import('../../app/api/aliases/route')
    const res = await GET(new NextRequest('http://localhost/api/aliases'), { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })
})
