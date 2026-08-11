export interface ProwlarrIndexer {
  id: number
  name: string
  enable: boolean
  protocol?: string
  privacy?: string
}

export interface JackettIndexer {
  id: string
  name: string
  configured: boolean
}

export interface ApplicationStatus {
  configured: boolean
  reachable: boolean
  installed: boolean
  id?: number
}

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}
