export interface SearchResult {
  guid: string
  title: string
  originalTitle: string
  indexerId?: number | string
  indexerName?: string
  infoUrl?: string
  downloadUrl: string
  infoHash?: string
  size?: number
  seeders?: number
  leechers?: number
  peers?: number
  publishDate?: string
  categories: number[]
  protocol?: 'torrent' | 'usenet'
}

export interface GenerateQueriesInput {
  titles: string[]
  season?: number
  episode?: number
  year?: number
  mediaType?: 'series' | 'movie'
  maxFormatsPerTitle: number
  maxQueries: number
}
