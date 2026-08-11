export interface ProwlarrCategory {
  id: number
  name?: string
}

export interface ProwlarrRelease {
  guid?: string
  title?: string
  infoUrl?: string
  downloadUrl?: string
  magnetUrl?: string
  size?: number
  seeders?: number
  leechers?: number
  peers?: number
  publishDate?: string
  categories?: ProwlarrCategory[] | number[]
  indexerId?: number
  indexer?: string
  infoHash?: string
  protocol?: string
}
