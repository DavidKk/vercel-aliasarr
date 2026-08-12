import { buildCapsXml } from '../../../services/torznab/caps'

describe('buildCapsXml', () => {
  it('declares tvsearch and movie-search', () => {
    const xml = buildCapsXml()
    expect(xml).toContain('tv-search')
    expect(xml).toContain('movie-search')
    expect(xml).toContain('available="yes"')
    expect(xml).toContain('season')
    expect(xml).toContain('ep')
    expect(xml).toContain('year')
    expect(xml).toContain('tvdbid')
    expect(xml).toContain('tmdbid')
    expect(xml).toContain('2000')
  })
})
