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
})
