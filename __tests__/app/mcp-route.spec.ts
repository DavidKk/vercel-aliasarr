import { NextRequest } from 'next/server'

const API_KEY = 'test-torznab-key-0123456789abcdef'

jest.mock('../../services/config', () => ({
  loadAliasarrConfig: jest.fn(async () => ({
    config: { version: 1, connections: {}, indexers: { prowlarr: { mode: 'all', indexerIds: [] }, jackett: { mode: 'all', indexerIds: [] } } },
    secrets: {
      torznabApiKey: API_KEY,
      prowlarrApiKey: '',
      jackettApiKey: '',
      sonarrApiKey: '',
      radarrApiKey: '',
      gistToken: '',
      tmdbApiKey: '',
      bangumiAccessToken: '',
    },
    exists: true,
    revision: 'r1',
  })),
}))

jest.mock('../../app/api/mcp/aliasarrMcpServer', () => ({
  manifest: jest.fn(async () =>
    Response.json({
      tools: [{ name: 'aliasarr_health' }],
      resources: [{ uri: 'aliasarr://skills/mcp/SKILL.md' }],
    })
  ),
  execute: jest.fn(async () => Response.json({ jsonrpc: '2.0', id: 1, result: { tools: [] } })),
}))

describe('MCP route auth', () => {
  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('rejects missing API key', async () => {
    const { GET } = await import('../../app/api/mcp/route')
    const res = await GET(new NextRequest('http://localhost/api/mcp'), { params: Promise.resolve({}) })
    expect(res.status).toBe(401)
  })

  it('returns manifest with valid API key', async () => {
    const { GET } = await import('../../app/api/mcp/route')
    const res = await GET(new NextRequest('http://localhost/api/mcp', { headers: { 'x-api-key': API_KEY } }), { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tools?.[0]?.name).toBe('aliasarr_health')
  })
})
