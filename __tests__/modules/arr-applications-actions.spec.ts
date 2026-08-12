import { type ArrAppActionResult, type ArrBulkActionResult, runArrApplicationAction, summarizeArrBulkAction } from '../../services/arr/applications-actions'

jest.mock('../../services/arr/client', () => ({
  createArrClient: jest.fn(),
}))

jest.mock('../../services/arr/sync-targets', () => ({
  applicationConnectionConfig: jest.fn(),
  loadAliasarrIndexerTargetsForSync: jest.fn(),
}))

jest.mock('../../services/config', () => ({
  loadAliasarrConfig: jest.fn(),
}))

import { createArrClient } from '../../services/arr/client'
import { applicationConnectionConfig, loadAliasarrIndexerTargetsForSync } from '../../services/arr/sync-targets'
import { loadAliasarrConfig } from '../../services/config'

const createArrClientMock = createArrClient as jest.MockedFunction<typeof createArrClient>
const applicationConnectionConfigMock = applicationConnectionConfig as jest.MockedFunction<typeof applicationConnectionConfig>
const loadTargetsMock = loadAliasarrIndexerTargetsForSync as jest.MockedFunction<typeof loadAliasarrIndexerTargetsForSync>
const loadConfigMock = loadAliasarrConfig as jest.MockedFunction<typeof loadAliasarrConfig>

describe('arr application bulk actions', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    loadConfigMock.mockResolvedValue({
      config: {
        connections: { aliasarrUrl: 'https://aliasarr.example/api/torznab', sonarrUrl: 'http://sonarr', radarrUrl: 'http://radarr' },
      },
      secrets: { torznabApiKey: 'key', sonarrApiKey: 's', radarrApiKey: 'r' },
      exists: true,
    } as never)
  })

  it('syncs both apps when application is all', async () => {
    loadTargetsMock.mockResolvedValue({
      targets: [{ name: '1337x (Aliasarr · Prowlarr)', baseUrl: 'https://aliasarr.example/api/torznab/prowlarr/1', apiKey: 'key' }],
      failedProviders: [],
      aliasarrUrl: 'https://aliasarr.example/api/torznab',
      apiKey: 'key',
    })
    applicationConnectionConfigMock.mockImplementation((app) => ({ application: app, baseUrl: `http://${app}`, apiKey: 'k' }) as never)
    createArrClientMock.mockImplementation(() => ({
      sync: jest.fn(async () => ({ created: 1, updated: 0, removed: 0, forced: 0, installedCount: 1 })),
      remove: jest.fn(),
      ping: jest.fn(),
      status: jest.fn(),
    }))

    const result = await runArrApplicationAction('all', 'sync')
    expect(result.results.sonarr?.status).toBe('ok')
    expect(result.results.radarr?.status).toBe('ok')
    expect(summarizeArrBulkAction(result).message).toContain('Sonarr: 1 indexer')
    expect(summarizeArrBulkAction(result).noop).toBe(false)
  })

  it('marks fully skipped syncs as noop', () => {
    const result: ArrBulkActionResult = {
      application: 'all',
      action: 'sync',
      results: {
        sonarr: { status: 'skipped', reason: 'sonarr is not configured' } satisfies ArrAppActionResult,
        radarr: { status: 'skipped', reason: 'radarr is not configured' } satisfies ArrAppActionResult,
      },
    }
    expect(summarizeArrBulkAction(result)).toEqual(expect.objectContaining({ ok: true, noop: true }))
  })

  it('removes managed indexers from every configured app', async () => {
    applicationConnectionConfigMock.mockImplementation((app) => (app === 'sonarr' ? ({ application: app, baseUrl: 'http://sonarr', apiKey: 'k' } as never) : null))
    const remove = jest.fn(async () => ({ removed: 3 }))
    createArrClientMock.mockReturnValue({ sync: jest.fn(), remove, ping: jest.fn(), status: jest.fn() })

    const result = await runArrApplicationAction('all', 'remove')
    expect(result.results.sonarr).toEqual({ status: 'ok', result: { removed: 3 } })
    expect(result.results.radarr).toEqual({ status: 'skipped', reason: 'radarr is not configured' })
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('syncs empty targets as a prune instead of skipping', async () => {
    loadTargetsMock.mockResolvedValue({
      targets: [],
      failedProviders: [],
      aliasarrUrl: 'https://aliasarr.example/api/torznab',
      apiKey: 'key',
    })
    applicationConnectionConfigMock.mockImplementation((app) => ({ application: app, baseUrl: `http://${app}`, apiKey: 'k' }) as never)
    const sync = jest.fn(async () => ({ created: 0, updated: 0, removed: 2, forced: 0, installedCount: 0 }))
    createArrClientMock.mockReturnValue({ sync, remove: jest.fn(), ping: jest.fn(), status: jest.fn() })

    const result = await runArrApplicationAction('sonarr', 'sync')
    expect(sync).toHaveBeenCalledWith([], { retainProviders: [] })
    expect(result.results.sonarr).toEqual({ status: 'ok', result: { created: 0, updated: 0, removed: 2, forced: 0, installedCount: 0 } })
  })
})
