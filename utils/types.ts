export type MediaType = 'series'

export interface MediaIdentity {
  tvdbId?: number
  tmdbId?: number
  imdbId?: string
  primaryTitle?: string
  year?: number
  mediaType: MediaType
}
