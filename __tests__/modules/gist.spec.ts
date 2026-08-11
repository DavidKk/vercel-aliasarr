import { createGistFileIfAbsent, fetchGist, GistRevisionConflictError, mutateGistFile, readGistFile, resetGistState } from '../../services/gist'

const credentials = { gistId: 'gist-id', gistToken: 'gist-token' }

describe('gist storage', () => {
  afterEach(() => {
    resetGistState()
    unstubAllGlobals()
  })

  it('caches gist metadata and reuses it when reading a file', async () => {
    const fetchMock = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            history: [{ version: 'v1' }],
            files: { 'movies-tmdb-550.yaml': { content: 'media: {}\n' } },
          }),
          { status: 200 }
        )
    )
    stubGlobal('fetch', fetchMock)

    const gist = await fetchGist(credentials)
    const content = await readGistFile({ ...credentials, fileName: 'movies-tmdb-550.yaml' })
    const sameGist = await fetchGist(credentials)

    expect(content).toBe('media: {}\n')
    expect(sameGist).toBe(gist)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serializes writes and rejects the second stale revision', async () => {
    let revision = 'v1'
    const calls: string[] = []
    stubGlobal(
      'fetch',
      jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        calls.push(method)
        if (method === 'PATCH') {
          revision = 'v2'
        }
        return new Response(
          JSON.stringify({
            history: [{ version: revision }],
            files: { 'movies-tmdb-550.yaml': { content: 'media: {}\n' } },
          }),
          { status: 200 }
        )
      })
    )

    const writes = await Promise.allSettled([
      mutateGistFile({ ...credentials, fileName: 'movies-tmdb-550.yaml', content: 'one', expectedRevision: 'v1' }),
      mutateGistFile({ ...credentials, fileName: 'movies-tmdb-550.yaml', content: 'two', expectedRevision: 'v1' }),
    ])

    expect(writes[0].status).toBe('fulfilled')
    expect(writes[1].status).toBe('rejected')
    expect(writes[1].status === 'rejected' ? writes[1].reason : null).toBeInstanceOf(GistRevisionConflictError)
    expect(calls).toEqual(['GET', 'PATCH', 'GET'])
  })

  it('does not overwrite an existing file during automatic write-back', async () => {
    const fetchMock = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            history: [{ version: 'v1' }],
            files: { 'movies-tmdb-550.yaml': { content: 'manual content' } },
          }),
          { status: 200 }
        )
    )
    stubGlobal('fetch', fetchMock)

    const result = await createGistFileIfAbsent({
      ...credentials,
      fileName: 'movies-tmdb-550.yaml',
      content: 'automatic content',
    })

    expect(result.created).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
