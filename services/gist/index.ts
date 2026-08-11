export interface Gist {
  updated_at?: string
  history?: Array<{ version?: string }>
  files: Record<
    string,
    {
      content?: string
      raw_url?: string
      filename?: string
      size?: number
    }
  >
}

interface CachedGist {
  expiresAt: number
  value: Gist
}

const GIST_CACHE_TTL_MS = 30_000
const gistCache = new Map<string, CachedGist>()
const gistWriteQueues = new Map<string, Promise<void>>()

export class GistRevisionConflictError extends Error {
  constructor(
    public readonly expectedRevision: string | null,
    public readonly actualRevision: string | null
  ) {
    super('Gist changed since this file was opened')
    this.name = 'GistRevisionConflictError'
  }
}

export interface GistCredentials {
  gistId: string
  gistToken: string
}

export async function fetchGist(params: GistCredentials, options: { forceFresh?: boolean } = {}): Promise<Gist> {
  const cached = gistCache.get(params.gistId)
  if (!options.forceFresh && cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const response = await fetch(`https://api.github.com/gists/${params.gistId}`, {
    headers: {
      Authorization: `Bearer ${params.gistToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Aliasarr',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch gist (${response.status})`)
  }
  const gist = (await response.json()) as Gist
  gistCache.set(params.gistId, { value: gist, expiresAt: Date.now() + GIST_CACHE_TTL_MS })
  return gist
}

export function getGistRevision(gist: Gist): string | null {
  return gist.history?.[0]?.version ?? gist.updated_at ?? null
}

export async function readGistFile(params: GistCredentials & { fileName: string }, options: { forceFresh?: boolean; gist?: Gist } = {}): Promise<string> {
  const { files } = options.gist ?? (await fetchGist(params, { forceFresh: options.forceFresh }))
  const file = files[params.fileName]
  if (typeof file?.content !== 'string' && file?.raw_url) {
    const raw = await fetch(file.raw_url, { signal: AbortSignal.timeout(10000) })
    if (!raw.ok) throw new Error(`Failed to fetch gist file raw (${raw.status})`)
    return raw.text()
  }
  if (typeof file?.content !== 'string') {
    throw new Error(`File ${params.fileName} not found in gist`)
  }
  return file.content
}

async function writeGistFile(params: GistCredentials & { fileName: string; content: string | null }): Promise<Gist> {
  const response = await fetch(`https://api.github.com/gists/${params.gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${params.gistToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Aliasarr',
    },
    body: JSON.stringify({
      files: {
        [params.fileName]: params.content === null ? null : { content: params.content },
      },
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    throw new Error(`Failed to update gist (${response.status})`)
  }
  return response.json()
}

async function withGistWriteLock<T>(gistId: string, task: () => Promise<T>): Promise<T> {
  const previous = gistWriteQueues.get(gistId) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const queued = previous.catch(() => undefined).then(() => gate)
  gistWriteQueues.set(gistId, queued)

  await previous.catch(() => undefined)
  try {
    return await task()
  } finally {
    release()
    if (gistWriteQueues.get(gistId) === queued) gistWriteQueues.delete(gistId)
  }
}

export async function mutateGistFile(
  params: GistCredentials & { fileName: string; content: string | null; expectedRevision: string | null }
): Promise<{ gist: Gist; revision: string | null }> {
  return withGistWriteLock(params.gistId, async () => {
    const current = await fetchGist(params, { forceFresh: true })
    const actualRevision = getGistRevision(current)
    if (params.expectedRevision !== actualRevision) {
      throw new GistRevisionConflictError(params.expectedRevision, actualRevision)
    }

    const gist = await writeGistFile(params)
    gistCache.set(params.gistId, { value: gist, expiresAt: Date.now() + GIST_CACHE_TTL_MS })
    return { gist, revision: getGistRevision(gist) }
  })
}

export async function createGistFileIfAbsent(params: GistCredentials & { fileName: string; content: string }): Promise<{ created: boolean; revision: string | null }> {
  return withGistWriteLock(params.gistId, async () => {
    const current = await fetchGist(params, { forceFresh: true })
    if (current.files[params.fileName]) {
      return { created: false, revision: getGistRevision(current) }
    }

    const gist = await writeGistFile(params)
    gistCache.set(params.gistId, { value: gist, expiresAt: Date.now() + GIST_CACHE_TTL_MS })
    return { created: true, revision: getGistRevision(gist) }
  })
}

export function resetGistState(): void {
  gistCache.clear()
  gistWriteQueues.clear()
}

export function listAliasGistPaths(files: Gist['files']): string[] {
  return Object.keys(files)
    .filter(
      (name) =>
        (name.startsWith('series-') || name.startsWith('movies-') || name.startsWith('series/') || name.startsWith('movies/')) && (name.endsWith('.yaml') || name.endsWith('.yml'))
    )
    .sort()
}

export function candidateGistPaths(identity: { mediaType: 'series' | 'movie'; tvdbId?: number; tmdbId?: number; imdbId?: string }): string[] {
  const prefix = identity.mediaType === 'series' ? 'series' : 'movies'
  const paths: string[] = []
  const addCandidate = (kind: 'tvdb' | 'tmdb' | 'imdb', id: string | number) => {
    // Gist is a flat file collection and rejects slash-separated pseudo paths.
    // Keep the legacy slash form as a read-only fallback for older fixtures/data.
    paths.push(`${prefix}-${kind}-${id}.yaml`, `${prefix}/${kind}-${id}.yaml`)
  }
  if (identity.mediaType === 'series' && identity.tvdbId != null) {
    addCandidate('tvdb', identity.tvdbId)
  }
  if (identity.tmdbId != null) {
    addCandidate('tmdb', identity.tmdbId)
  }
  if (identity.imdbId) {
    addCandidate('imdb', identity.imdbId)
  }
  return paths
}
