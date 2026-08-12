export type TorznabType = 'caps' | 'search' | 'tvsearch' | 'movie'

export interface TorznabRequest {
  type: TorznabType
  q?: string
  season?: number
  ep?: number
  year?: number
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  categories: number[]
  limit: number
  offset: number
  apikey?: string
}

export interface TorznabItem {
  title: string
  guid: string
  link: string
  infoUrl?: string
  indexerId?: number | string
  indexerName?: string
  pubDate: Date
  size?: number
  categories: number[]
  seeders?: number
  leechers?: number
  peers?: number
  infoHash?: string
}
