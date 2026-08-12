import { createMemoryCache } from '../../../services/cache/memory-cache'
import { resetGistState } from '../../../services/gist'
import { createAliasProviderChain } from '../../../services/media/providers/resolve'

describe('alias provider chain', () => {
  afterEach(() => {
    resetGistState()
    unstubAllEnvs()
    unstubAllGlobals()
  })

  it('uses gist yaml when remote metadata sources are empty', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    stubEnv('GIST_ID', 'gist-id')
    stubEnv('GIST_TOKEN', 'gist-token')
    const { resetEnvCache } = await import('../../../utils/env')
    resetEnvCache()

    stubGlobal(
      'fetch',
      jest.fn(
        async () =>
          new Response(
            JSON.stringify({
              files: {
                'series-tvdb-1.yaml': {
                  content: `media:\n  mediaType: series\n  tvdbId: 1\n  primaryTitle: Test\n  aliases:\n    - title: \u6d4b\u8bd5\u5267\n      type: original\n      priority: 100\n      verified: true\n`,
                },
              },
            }),
            { status: 200 }
          )
      )
    )

    const chain = createAliasProviderChain(createMemoryCache(), { gist: { gistId: 'gist-id', gistToken: 'gist-token' } })
    const out = await chain.resolve({ mediaType: 'series', tvdbId: 1 })
    expect(out.sources).toContain('gist')
    expect(out.media?.aliases.some((a) => a.title === '\u6d4b\u8bd5\u5267')).toBe(true)
  })

  it('uses tmdb chinese title when available', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    stubEnv('TMDB_API_KEY', 'tmdb-test-key')
    const { resetEnvCache } = await import('../../../utils/env')
    resetEnvCache()

    stubGlobal(
      'fetch',
      jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/find/')) {
          return new Response(JSON.stringify({ tv_results: [{ id: 99 }] }), { status: 200 })
        }
        if (url.includes('language=zh-CN')) {
          return new Response(JSON.stringify({ id: 99, name: '\u5e86\u4f59\u5e74', original_name: '\u5e86\u4f59\u5e74', original_language: 'zh' }), { status: 200 })
        }
        if (url.includes('/tv/99')) {
          return new Response(JSON.stringify({ id: 99, name: 'Joy of Life', original_name: '\u5e86\u4f59\u5e74', original_language: 'zh' }), { status: 200 })
        }
        return new Response(JSON.stringify({ list: [] }), { status: 200 })
      })
    )

    const chain = createAliasProviderChain(createMemoryCache(), { tmdbApiKey: 'tmdb-test-key' })
    const out = await chain.resolve({ mediaType: 'series', tvdbId: 366625 })
    expect(out.sources).toContain('tmdb')
    expect(out.media?.aliases.some((a) => a.title.includes('\u5e86\u4f59\u5e74'))).toBe(true)
  })

  it('writes a remote result to gist and uses it before third-party providers next time', async () => {
    stubEnv('TORZNAB_API_KEY', '0123456789abcdef')
    stubEnv('PROWLARR_URL', 'https://prowlarr.example.com')
    stubEnv('PROWLARR_API_KEY', 'prowlarr-key')
    stubEnv('TMDB_API_KEY', 'tmdb-test-key')
    stubEnv('GIST_ID', 'write-back-gist')
    stubEnv('GIST_TOKEN', 'gist-token')
    const { resetEnvCache } = await import('../../../utils/env')
    resetEnvCache()

    let revision = 'v1'
    let tmdbCalls = 0
    const files: Record<string, { content: string }> = {}
    stubGlobal(
      'fetch',
      jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('api.github.com/gists/')) {
          if (init?.method === 'PATCH') {
            const body = JSON.parse(String(init.body)) as { files: Record<string, { content: string }> }
            Object.assign(files, body.files)
            revision = 'v2'
          }
          return new Response(JSON.stringify({ history: [{ version: revision }], files }), { status: 200 })
        }
        if (url.includes('api.themoviedb.org')) {
          tmdbCalls += 1
          if (url.includes('/find/')) {
            return new Response(JSON.stringify({ tv_results: [{ id: 99 }] }), { status: 200 })
          }
          if (url.includes('language=zh-CN')) {
            return new Response(JSON.stringify({ id: 99, name: '\u5e86\u4f59\u5e74', original_name: '\u5e86\u4f59\u5e74', original_language: 'zh' }), {
              status: 200,
            })
          }
          return new Response(JSON.stringify({ id: 99, name: 'Joy of Life', original_name: '\u5e86\u4f59\u5e74', original_language: 'zh' }), {
            status: 200,
          })
        }
        if (url.includes('api.bgm.tv')) {
          return new Response(JSON.stringify({ list: [] }), { status: 200 })
        }
        throw new Error(`Unexpected request: ${url}`)
      })
    )

    const identity = { mediaType: 'series' as const, tvdbId: 366625 }
    const providerConfig = { tmdbApiKey: 'tmdb-test-key', gist: { gistId: 'write-back-gist', gistToken: 'gist-token' } }
    const first = await createAliasProviderChain(createMemoryCache(), providerConfig).resolve(identity)
    const callsAfterFirstResolve = tmdbCalls
    const second = await createAliasProviderChain(createMemoryCache(), providerConfig).resolve(identity)

    expect(first.sources).toContain('tmdb')
    expect(files['series-tvdb-366625.yaml']?.content).toContain('primaryTitle: \u5e86\u4f59\u5e74')
    expect(second.sources).toEqual(['gist'])
    expect(second.media?.primaryTitle).toBe('\u5e86\u4f59\u5e74')
    expect(tmdbCalls).toBe(callsAfterFirstResolve)
  })
})
