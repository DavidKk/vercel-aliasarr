import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { NextRequest } from 'next/server'

jest.mock('../../services/auth/access', () => ({
  validateCookie: jest.fn(async () => true),
}))

jest.mock('../../services/app/runtime', () => ({
  getAppRuntime: jest.fn(async () => ({ cache: { clear: jest.fn(async () => undefined) } })),
  resetAppRuntime: jest.fn(),
}))

import { PUT } from '../../app/api/config/route'
import { defaultAliasarrConfig, defaultAliasarrSecrets, loadAliasarrConfig, saveAliasarrConfig } from '../../services/config'
import { resetEnvCache } from '../../utils/env'

let testDirectory: string | null = null

afterEach(async () => {
  jest.restoreAllMocks()
  unstubAllEnvs()
  resetEnvCache()
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true })
  testDirectory = null
})

describe('configuration route', () => {
  it('saves a completed service without requiring unrelated configuration', async () => {
    testDirectory = await mkdtemp(path.join(tmpdir(), 'aliasarr-config-route-'))
    jest.spyOn(process, 'cwd').mockReturnValue(testDirectory)
    stubEnv('NODE_ENV', 'development')
    stubEnv('CONFIG_ENCRYPTION_KEY', Buffer.alloc(32, 9).toString('base64'))
    resetEnvCache()

    const existingConfig = defaultAliasarrConfig()
    existingConfig.connections.aliasarrUrl = 'http://aliasarr:3000/api/torznab'
    const existingSecrets = defaultAliasarrSecrets()
    existingSecrets.torznabApiKey = 'existing-server-key'
    const existing = await saveAliasarrConfig(existingConfig, existingSecrets, null)

    const config = defaultAliasarrConfig()
    config.connections.radarrUrl = 'http://radarr:7878'
    const request = new NextRequest('http://localhost/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        secrets: { radarrApiKey: 'radarr-secret', torznabApiKey: null },
        revision: existing.revision,
        section: 'applications',
      }),
    })

    const response = await PUT(request, { params: Promise.resolve({}) })
    const payload = await response.json()
    const stored = await loadAliasarrConfig()

    expect(response.status).toBe(200)
    expect(payload.code).toBe(0)
    expect(stored.config.connections.radarrUrl).toBe('http://radarr:7878')
    expect(stored.config.connections.aliasarrUrl).toBe('http://aliasarr:3000/api/torznab')
    expect(stored.secrets.radarrApiKey).toBe('radarr-secret')
    expect(stored.secrets.torznabApiKey).toBe('existing-server-key')
    expect(stored.encrypted).toBe(true)
  })
})
