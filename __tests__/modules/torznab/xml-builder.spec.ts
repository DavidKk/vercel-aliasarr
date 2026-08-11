import { buildErrorXml, buildRssXml } from '../../../services/torznab/xml-builder'

describe('xml-builder', () => {
  it('escapes special characters in titles', () => {
    const xml = buildRssXml([
      {
        title: `\u5e86\u4f59\u5e74 & <test> "quote"`,
        guid: 'abc',
        link: 'https://example.com/dl',
        infoUrl: 'https://example.com/details/abc',
        indexerId: 4,
        indexerName: 'Example',
        pubDate: new Date('2024-01-01T00:00:00Z'),
        size: 1000,
        categories: [5000],
        seeders: 10,
        peers: 12,
      },
    ])
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;test&gt;')
    expect(xml).not.toContain('<test>')
    expect(xml).toContain('<description/>')
    expect(xml).toContain('<comments>https://example.com/details/abc</comments>')
    expect(xml).toContain('<prowlarrindexer id="4" type="proxy">Example</prowlarrindexer>')
    expect(xml).toContain('name="downloadvolumefactor" value="1"')
  })

  it('builds torznab error xml', () => {
    const xml = buildErrorXml(100, 'Unauthorized')
    expect(xml).toContain('error code="100"')
    expect(xml).toContain('Unauthorized')
  })
})
