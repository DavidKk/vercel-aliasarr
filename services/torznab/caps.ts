import { create } from 'xmlbuilder2'

export function buildCapsXml(): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('caps')

  doc
    .ele('server')
    .att('version', '1.1')
    .att('title', 'Aliasarr')
    .att('strapline', 'Chinese alias Torznab proxy for Sonarr and Radarr')
    .att('email', '')
    .att('url', '')
    .att('image', '')

  doc.ele('limits').att('max', '100').att('default', '100')

  const searching = doc.ele('searching')
  searching.ele('search').att('available', 'yes').att('supportedParams', 'q,cat,limit,offset')
  searching.ele('tv-search').att('available', 'yes').att('supportedParams', 'q,season,ep,tvdbid,tmdbid,imdbid,cat,limit,offset')
  searching.ele('movie-search').att('available', 'yes').att('supportedParams', 'q,imdbid,tmdbid,year,cat,limit,offset')
  searching.ele('music-search').att('available', 'no')
  searching.ele('book-search').att('available', 'no')

  const cats = doc.ele('categories')
  const tv = cats.ele('category').att('id', '5000').att('name', 'TV')
  tv.ele('subcat').att('id', '5030').att('name', 'TV/SD')
  tv.ele('subcat').att('id', '5040').att('name', 'TV/HD')
  tv.ele('subcat').att('id', '5045').att('name', 'TV/UHD')

  const movies = cats.ele('category').att('id', '2000').att('name', 'Movies')
  movies.ele('subcat').att('id', '2030').att('name', 'Movies/SD')
  movies.ele('subcat').att('id', '2040').att('name', 'Movies/HD')
  movies.ele('subcat').att('id', '2045').att('name', 'Movies/UHD')

  return doc.end({ prettyPrint: true })
}
