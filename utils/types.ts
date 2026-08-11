export type MediaType = 'series' | 'movie'

export interface MediaIdentity {
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  primaryTitle?: string
  year?: number
  mediaType: MediaType
}
