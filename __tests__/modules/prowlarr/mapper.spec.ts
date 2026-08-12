import { mapProwlarrRelease } from '../../../services/prowlarr/mapper'

describe('mapProwlarrRelease', () => {
  it('maps fields and rewrites download host when configured', () => {
    const result = mapProwlarrRelease(
      {
        guid: 'g1',
        title: '\u5e86\u4f59\u5e74 S02E12',
        infoUrl: 'https://indexer.example.com/details/g1',
        downloadUrl: 'https://public.example.com/1/download?apikey=SECRET',
        size: 1,
        seeders: 5,
        leechers: 6,
        publishDate: '2024-01-01T00:00:00Z',
        categories: [{ id: 5000 }],
        indexerId: 1,
        indexer: 'PT',
        infoHash: 'ABC',
        protocol: 'torrent',
      },
      {
        sonarrBaseUrl: 'http://prowlarr:9696',
        upstreamBaseUrl: 'https://public.example.com',
      }
    )
    expect(result.downloadUrl.startsWith('http://prowlarr:9696/')).toBe(true)
    expect(result.originalTitle).toBe('\u5e86\u4f59\u5e74 S02E12')
    expect(result.infoHash).toBe('ABC')
    expect(result.infoUrl).toBe('https://indexer.example.com/details/g1')
    expect(result.peers).toBe(11)
  })
})
