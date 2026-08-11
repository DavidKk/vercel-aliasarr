import type { JackettApiError } from '../../services/jackett'
import { createJackettClient } from '../../services/jackett'

const indexerXml = `<?xml version="1.0" encoding="UTF-8"?>
<indexers>
  <indexer id="mikan"><title>Mikan</title><configured>true</configured></indexer>
  <indexer id="nyaasi"><title>Nyaa.si</title><configured>true</configured></indexer>
</indexers>`

const searchXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <item>
      <title>\u5e86\u4f59\u5e74 S02E12</title>
      <guid>jackett:release:1</guid>
      <link>http://jackett/download/1</link>
      <comments>https://example.com/details/1</comments>
      <pubDate>Mon, 10 Aug 2026 08:00:00 GMT</pubDate>
      <size>123456</size>
      <category>5000</category>
      <jackettindexer id="mikan">Mikan</jackettindexer>
      <torznab:attr name="category" value="5040" />
      <torznab:attr name="seeders" value="12" />
      <torznab:attr name="peers" value="17" />
      <torznab:attr name="infohash" value="ABCDEF" />
    </item>
  </channel>
</rss>`

afterEach(() => {
  unstubAllGlobals()
})

describe('Jackett client', () => {
  it('discovers configured indexers', async () => {
    const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL]>(async () => new Response(indexerXml, { status: 200 }))
    stubGlobal('fetch', fetchMock)

    const client = createJackettClient({ baseUrl: 'http://jackett:9117', apiKey: 'secret', timeoutMs: 1000 })
    await expect(client.listIndexers()).resolves.toEqual([
      { id: 'mikan', name: 'Mikan', configured: true },
      { id: 'nyaasi', name: 'Nyaa.si', configured: true },
    ])
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('t=indexers')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('configured=true')
  })

  it('maps Torznab results and preserves the Jackett indexer identity', async () => {
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response(searchXml, { status: 200 }))
    )
    const client = createJackettClient({ baseUrl: 'http://jackett:9117', apiKey: 'secret', timeoutMs: 1000 })

    const results = await client.search('\u5e86\u4f59\u5e74 S02E12', { categories: [5000], indexerIds: ['mikan'] })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: '\u5e86\u4f59\u5e74 S02E12',
      indexerId: 'mikan',
      indexerName: 'Mikan',
      seeders: 12,
      peers: 17,
      leechers: 5,
      infoHash: 'ABCDEF',
      categories: [5000, 5040],
    })
  })

  it('recognizes a Torznab error returned with HTTP 200', async () => {
    const errorXml = '<?xml version="1.0"?><error code="100" description="Invalid API Key" />'
    stubGlobal(
      'fetch',
      jest.fn(async () => new Response(errorXml, { status: 200 }))
    )
    const client = createJackettClient({ baseUrl: 'http://jackett:9117', apiKey: 'wrong', timeoutMs: 1000 })

    await expect(client.listIndexers()).rejects.toEqual(expect.objectContaining<Partial<JackettApiError>>({ code: '100', description: 'Invalid API Key' }))
    await expect(client.ping()).resolves.toBe(false)
  })
})
