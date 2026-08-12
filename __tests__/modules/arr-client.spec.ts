import { createArrClient } from '../../services/arr'

function torznabResource(id = 38) {
  return {
    id,
    name: 'Aliasarr',
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    fields: [
      { name: 'baseUrl', value: '' },
      { name: 'apiPath', value: '' },
      { name: 'apiKey', value: '' },
      { name: 'categories', value: [] },
      { name: 'animeCategories', value: [] },
    ],
  }
}

afterEach(() => {
  unstubAllGlobals()
})

describe('*arr application client', () => {
  it('updates an existing indexer after a successful Sonarr test', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v3/indexer') && init?.method == null) {
        return Response.json([torznabResource(44)])
      }
      if (url.endsWith('/api/v3/indexer/test')) return Response.json({})
      if (url.endsWith('/api/v3/indexer/44') && init?.method === 'PUT') {
        return Response.json({ ...torznabResource(44), ...(JSON.parse(String(init.body)) as object) })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({ application: 'sonarr', baseUrl: 'http://sonarr:8989', apiKey: 'sonarr-key' })

    await expect(client.sync({ baseUrl: 'http://aliasarr/api/torznab', apiKey: 'aliasarr-key' })).resolves.toEqual({
      created: false,
      id: 44,
      forced: false,
    })
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('forceSave=true'))).toBe(false)
  })

  it('force-saves Radarr only when its test reports no results in configured categories', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v3/indexer') && init?.method == null) return Response.json([torznabResource()])
      if (url.endsWith('/api/v3/indexer/test')) {
        return Response.json([{ errorMessage: 'Query successful, but no results in the configured categories were returned from your indexer.' }], { status: 400 })
      }
      if (url.endsWith('/api/v3/indexer/38?forceSave=true') && init?.method === 'PUT') {
        return Response.json({ ...torznabResource(), ...(JSON.parse(String(init.body)) as object) })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({ application: 'radarr', baseUrl: 'http://radarr:7878', apiKey: 'radarr-key' })

    await expect(client.sync({ baseUrl: 'http://aliasarr/api/torznab', apiKey: 'aliasarr-key' })).resolves.toEqual({
      created: false,
      id: 38,
      forced: true,
    })
  })

  it('does not force-save other validation failures', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith('/api/v3/indexer') && init?.method == null) return Response.json([torznabResource()])
        return Response.json([{ errorMessage: 'Unable to connect to indexer' }], { status: 400 })
      })
    )
    const client = createArrClient({ application: 'radarr', baseUrl: 'http://radarr:7878', apiKey: 'radarr-key' })

    await expect(client.sync({ baseUrl: 'http://aliasarr/api/torznab', apiKey: 'aliasarr-key' })).rejects.toThrow('Unable to connect to indexer')
  })

  it('sends custom headers with X-Api-Key on every request', async () => {
    const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>(async () => Response.json([]))
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({
      application: 'sonarr',
      baseUrl: 'http://sonarr:8989',
      apiKey: 'sonarr-key',
      headers: { 'CF-Access-Client-Id': 'id', 'X-Api-Key': 'spoof' },
    })

    await expect(client.status()).resolves.toEqual({ reachable: true, installed: false })
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        redirect: 'manual',
        headers: expect.objectContaining({
          'CF-Access-Client-Id': 'id',
          'X-Api-Key': 'sonarr-key',
        }),
      })
    )
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers).not.toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }))
  })

  it('surfaces Cloudflare Access blocks instead of a generic unreachable error', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response('Login required', { status: 302, headers: { 'cf-ray': 'abc', location: 'https://login.cloudflareaccess.com' } }))
    )
    const client = createArrClient({
      application: 'radarr',
      baseUrl: 'https://radarr.example.com',
      apiKey: 'radarr-key',
    })

    await expect(client.ping()).rejects.toThrow(/No custom headers were sent/i)
    await expect(client.status()).resolves.toEqual({ reachable: false, installed: false })
  })

  it('does not treat a plain API-key 401 as Cloudflare Access', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response('Unauthorized', { status: 401 }))
    )
    const client = createArrClient({
      application: 'radarr',
      baseUrl: 'https://radarr.example.com',
      apiKey: 'wrong',
    })

    await expect(client.ping()).rejects.toThrow(/radarr API 401/i)
  })

  it('does not treat orange-cloud 403 without Access signals as Cloudflare Access', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response('Forbidden', { status: 403, headers: { 'cf-ray': 'abc' } }))
    )
    const client = createArrClient({
      application: 'radarr',
      baseUrl: 'https://radarr.example.com',
      apiKey: 'radarr-key',
    })

    await expect(client.ping()).rejects.toThrow(/radarr API 403/i)
  })

  it('reports when Access headers were sent but Cloudflare still blocked', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response('Access denied by Cloudflare Access', { status: 403, headers: { 'cf-ray': 'abc' } }))
    )
    const client = createArrClient({
      application: 'radarr',
      baseUrl: 'https://radarr.example.com',
      apiKey: 'radarr-key',
      headers: {
        'CF-Access-Client-Id': 'id.access',
        'CF-Access-Client-Secret': 'secret',
      },
    })

    await expect(client.ping()).rejects.toThrow(/CF-Access-Client-Id, CF-Access-Client-Secret/i)
  })
})
