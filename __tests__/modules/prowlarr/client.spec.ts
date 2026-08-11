import { createProwlarrClient } from '../../../services/prowlarr/client'

describe('createProwlarrClient', () => {
  afterEach(() => {
    unstubAllGlobals()
  })

  it('returns empty array on upstream failure instead of throwing', async () => {
    stubGlobal('fetch', jest.fn().mockRejectedValue(new Error('network down')))
    const client = createProwlarrClient({
      baseUrl: 'https://prowlarr.example.com',
      apiKey: 'key',
      timeoutMs: 100,
    })
    await expect(client.search('\u5e86\u4f59\u5e74 S02E12')).resolves.toEqual([])
  })

  it('sends categories and repeated indexerIds to the aggregate search endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    stubGlobal('fetch', fetchMock)
    const client = createProwlarrClient({
      baseUrl: 'https://prowlarr.example.com',
      apiKey: 'key',
      timeoutMs: 100,
    })

    await client.search('Movie', { categories: [2000, 2040], indexerIds: [4, 20] })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/api/v1/search')
    expect(url.searchParams.getAll('categories')).toEqual(['2000', '2040'])
    expect(url.searchParams.getAll('indexerIds')).toEqual(['4', '20'])
  })

  it('merges custom headers under X-Api-Key', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    stubGlobal('fetch', fetchMock)
    const client = createProwlarrClient({
      baseUrl: 'https://prowlarr.example.com',
      apiKey: 'key',
      timeoutMs: 100,
      headers: { 'CF-Access-Client-Id': 'id', 'X-Api-Key': 'spoof' },
    })

    await expect(client.ping()).resolves.toBe(true)
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        redirect: 'manual',
        headers: { 'CF-Access-Client-Id': 'id', 'X-Api-Key': 'key' },
      })
    )
  })

  it('fails probe when Cloudflare Access redirects the request', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response('', { status: 302, headers: { location: 'https://login.cloudflareaccess.com' } }))
    )
    const client = createProwlarrClient({
      baseUrl: 'https://prowlarr.example.com',
      apiKey: 'key',
      timeoutMs: 100,
    })

    await expect(client.probe!()).rejects.toThrow(/No custom headers were sent/i)
    await expect(client.ping()).resolves.toBe(false)
  })
})
