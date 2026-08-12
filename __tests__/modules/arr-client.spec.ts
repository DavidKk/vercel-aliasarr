import { aliasarrManagedIndexerName, createArrClient, isAliasarrManagedIndexer, LEGACY_ALIASARR_INDEXER_NAME } from '../../services/arr'
import { aliasarrPublicOrigin, scopedTorznabBaseUrl } from '../../services/arr/sync-targets'

function torznabResource(id: number, name = LEGACY_ALIASARR_INDEXER_NAME, extras: Record<string, unknown> = {}) {
  return {
    id,
    name,
    implementation: 'Torznab',
    configContract: 'TorznabSettings',
    priority: 25,
    tags: [] as number[],
    enableRss: true,
    enableAutomaticSearch: true,
    enableInteractiveSearch: true,
    fields: [
      { name: 'baseUrl', value: '' },
      { name: 'apiPath', value: '' },
      { name: 'apiKey', value: '' },
      { name: 'categories', value: [5000] },
      { name: 'animeCategories', value: [] },
    ],
    ...extras,
  }
}

afterEach(() => {
  unstubAllGlobals()
})

describe('aliasarr managed indexer naming', () => {
  it('marks legacy and Aliasarr-managed Torznab entries', () => {
    expect(isAliasarrManagedIndexer({ implementation: 'Torznab', name: 'Aliasarr' })).toBe(true)
    expect(isAliasarrManagedIndexer({ implementation: 'Torznab', name: '1337x (Aliasarr)' })).toBe(true)
    expect(isAliasarrManagedIndexer({ implementation: 'Torznab', name: aliasarrManagedIndexerName('1337x', 'prowlarr') })).toBe(true)
    expect(isAliasarrManagedIndexer({ implementation: 'Torznab', name: '1337x (Prowlarr)' })).toBe(false)
  })

  it('disambiguates managed names by upstream provider', () => {
    expect(aliasarrManagedIndexerName('1337x', 'prowlarr')).toBe('1337x (Aliasarr · Prowlarr)')
    expect(aliasarrManagedIndexerName('1337x', 'jackett')).toBe('1337x (Aliasarr · Jackett)')
  })

  it('builds scoped Torznab base URLs from the public origin', () => {
    expect(aliasarrPublicOrigin('https://aliasarr.example/api/torznab')).toBe('https://aliasarr.example')
    expect(scopedTorznabBaseUrl('https://aliasarr.example', 'prowlarr', '12')).toBe('https://aliasarr.example/api/torznab/prowlarr/12')
  })
})

describe('*arr application client', () => {
  it('creates disabled then enables with forceSave, and prunes stale managed indexers', async () => {
    let listState = [
      torznabResource(10, LEGACY_ALIASARR_INDEXER_NAME),
      torznabResource(11, aliasarrManagedIndexerName('Old Tracker', 'prowlarr')),
      torznabResource(12, aliasarrManagedIndexerName('1337x', 'prowlarr'), { priority: 40, tags: [3] }),
    ]
    const deleted: number[] = []
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v3/indexer') && init?.method == null) return Response.json(listState)
      if (url.endsWith('/api/v3/indexer/schema')) return Response.json([torznabResource(0, '')])
      if (url.includes('/api/v3/indexer/12') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        expect(url).toContain('forceSave=true')
        listState = listState.map((item) => (item.id === 12 ? { ...item, ...body, id: 12 } : item))
        return Response.json(
          listState.find((item) => item.id === 12),
          { status: 202 }
        )
      }
      if (url.endsWith('/api/v3/indexer') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          name: string
          enableRss: boolean
          enableAutomaticSearch: boolean
          enableInteractiveSearch: boolean
        }
        expect(body.enableRss).toBe(false)
        expect(body.enableAutomaticSearch).toBe(false)
        expect(body.enableInteractiveSearch).toBe(false)
        const created = torznabResource(99, body.name, {
          enableRss: false,
          enableAutomaticSearch: false,
          enableInteractiveSearch: false,
        })
        listState = [...listState, created]
        return Response.json(created, { status: 201 })
      }
      if (url.includes('/api/v3/indexer/99') && init?.method === 'PUT') {
        expect(url).toContain('forceSave=true')
        const body = JSON.parse(String(init.body)) as {
          enableRss: boolean
          enableAutomaticSearch: boolean
          enableInteractiveSearch: boolean
        }
        expect(body.enableRss).toBe(true)
        expect(body.enableAutomaticSearch).toBe(true)
        expect(body.enableInteractiveSearch).toBe(true)
        listState = listState.map((item) => (item.id === 99 ? { ...item, ...body, id: 99 } : item))
        return Response.json(
          listState.find((item) => item.id === 99),
          { status: 202 }
        )
      }
      if (init?.method === 'DELETE') {
        const match = /\/api\/v3\/indexer\/(\d+)/.exec(url)
        if (match) {
          deleted.push(Number(match[1]))
          listState = listState.filter((item) => item.id !== Number(match[1]))
        }
        return new Response(null, { status: 204 })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({ application: 'sonarr', baseUrl: 'http://sonarr:8989', apiKey: 'sonarr-key' })

    await expect(
      client.sync([
        { name: aliasarrManagedIndexerName('1337x', 'prowlarr'), baseUrl: 'http://aliasarr/api/torznab/prowlarr/12', apiKey: 'aliasarr-key' },
        { name: aliasarrManagedIndexerName('ACG.RIP', 'prowlarr'), baseUrl: 'http://aliasarr/api/torznab/prowlarr/7', apiKey: 'aliasarr-key' },
      ])
    ).resolves.toEqual({
      created: 1,
      updated: 1,
      removed: 2,
      forced: 2,
      installedCount: 2,
    })
    expect(deleted.sort()).toEqual([10, 11])
    expect(listState.find((item) => item.id === 12)?.priority).toBe(40)
  })

  it('updates existing indexers with forceSave and preserves categories', async () => {
    const name = aliasarrManagedIndexerName('1337x', 'prowlarr')
    const existing = torznabResource(44, name, { priority: 10, tags: [7] })
    existing.fields.find((field) => field.name === 'categories')!.value = [5030]
    let listed = [existing]
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v3/indexer') && init?.method == null) return Response.json(listed)
      if (url.endsWith('/api/v3/indexer/44?forceSave=true') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as typeof existing
        listed = [{ ...existing, ...body, id: 44 }]
        expect(body.priority).toBe(10)
        expect(body.fields.find((field) => field.name === 'categories')?.value).toEqual([5030])
        return Response.json(listed[0], { status: 202 })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({ application: 'sonarr', baseUrl: 'http://sonarr:8989', apiKey: 'sonarr-key' })

    await expect(client.sync([{ name, baseUrl: 'http://aliasarr/api/torznab/prowlarr/12', apiKey: 'aliasarr-key' }])).resolves.toEqual({
      created: 0,
      updated: 1,
      removed: 0,
      forced: 1,
      installedCount: 1,
    })
  })

  it('prunes all managed indexers when syncing an empty target list', async () => {
    let listState = [torznabResource(1, LEGACY_ALIASARR_INDEXER_NAME), torznabResource(2, aliasarrManagedIndexerName('1337x', 'prowlarr'))]
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v3/indexer') && init?.method == null) return Response.json(listState)
      if (init?.method === 'DELETE') {
        const match = /\/api\/v3\/indexer\/(\d+)/.exec(url)
        if (match) listState = listState.filter((item) => item.id !== Number(match[1]))
        return new Response(null, { status: 204 })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({ application: 'sonarr', baseUrl: 'http://sonarr:8989', apiKey: 'sonarr-key' })
    await expect(client.sync([])).resolves.toEqual({ created: 0, updated: 0, removed: 2, forced: 0, installedCount: 0 })
  })

  it('retains managed indexers for providers whose listing failed', async () => {
    let listState = [torznabResource(1, aliasarrManagedIndexerName('Keep Me', 'jackett')), torznabResource(2, aliasarrManagedIndexerName('Stale', 'prowlarr'))]
    const deleted: number[] = []
    stubGlobal(
      'fetch',
      jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/v3/indexer') && init?.method == null) return Response.json(listState)
        if (url.endsWith('/api/v3/indexer/schema')) return Response.json([torznabResource(0, '')])
        if (url.includes('/api/v3/indexer/') && init?.method === 'PUT') {
          return Response.json({ id: 9 }, { status: 202 })
        }
        if (url.endsWith('/api/v3/indexer') && init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as { name: string }
          const created = torznabResource(9, body.name)
          listState = [...listState, created]
          return Response.json(created, { status: 201 })
        }
        if (init?.method === 'DELETE') {
          const match = /\/api\/v3\/indexer\/(\d+)/.exec(url)
          if (match) {
            deleted.push(Number(match[1]))
            listState = listState.filter((item) => item.id !== Number(match[1]))
          }
          return new Response(null, { status: 204 })
        }
        throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
      })
    )
    const client = createArrClient({ application: 'sonarr', baseUrl: 'http://sonarr:8989', apiKey: 'sonarr-key' })
    await client.sync([{ name: aliasarrManagedIndexerName('New', 'prowlarr'), baseUrl: 'http://a/api/torznab/prowlarr/1', apiKey: 'k' }], {
      retainProviders: ['jackett'],
    })
    expect(deleted).toEqual([2])
    expect(listState.some((item) => item.id === 1)).toBe(true)
  })

  it('rolls back a created indexer when enable fails', async () => {
    const deleted: number[] = []
    stubGlobal(
      'fetch',
      jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/api/v3/indexer') && init?.method == null) return Response.json([])
        if (url.endsWith('/api/v3/indexer/schema')) return Response.json([torznabResource(0, '')])
        if (url.endsWith('/api/v3/indexer') && init?.method === 'POST') {
          return Response.json(torznabResource(55, 'x'), { status: 201 })
        }
        if (url.includes('/api/v3/indexer/55') && init?.method === 'PUT') {
          return Response.json([{ errorMessage: 'boom' }], { status: 400 })
        }
        if (init?.method === 'DELETE') {
          deleted.push(55)
          return new Response(null, { status: 204 })
        }
        throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
      })
    )
    const client = createArrClient({ application: 'radarr', baseUrl: 'http://radarr:7878', apiKey: 'radarr-key' })
    await expect(client.sync([{ name: aliasarrManagedIndexerName('1337x', 'prowlarr'), baseUrl: 'http://a/api/torznab/prowlarr/1', apiKey: 'k' }])).rejects.toThrow(
      /boom|radarr API 400/i
    )
    expect(deleted).toEqual([55])
  })

  it('removes every managed Aliasarr indexer', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v3/indexer') && init?.method == null) {
        return Response.json([
          torznabResource(1, LEGACY_ALIASARR_INDEXER_NAME),
          torznabResource(2, aliasarrManagedIndexerName('1337x', 'prowlarr')),
          { id: 3, name: 'Other', implementation: 'Torznab', fields: [] },
        ])
      }
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })
    stubGlobal('fetch', fetchMock)
    const client = createArrClient({ application: 'sonarr', baseUrl: 'http://sonarr:8989', apiKey: 'sonarr-key' })
    await expect(client.remove()).resolves.toEqual({ removed: 2 })
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

    await expect(client.status()).resolves.toEqual({ reachable: true, installed: false, installedCount: 0 })
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'CF-Access-Client-Id': 'id',
          'X-Api-Key': 'sonarr-key',
        }),
      })
    )
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
    await expect(client.status()).resolves.toEqual({ reachable: false, installed: false, installedCount: 0 })
  })
})
