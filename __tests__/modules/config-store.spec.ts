import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { ConfigRevisionConflictError, loadAliasarrConfig, LOCAL_CONFIG_FILE, saveAliasarrConfig } from '../../services/config'

let testDirectory: string | null = null

afterEach(async () => {
  jest.restoreAllMocks()
  unstubAllEnvs()
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true })
  testDirectory = null
})

describe('local configuration store', () => {
  it('persists a partially configured service without requiring unrelated secrets', async () => {
    testDirectory = await mkdtemp(path.join(tmpdir(), 'aliasarr-config-'))
    jest.spyOn(process, 'cwd').mockReturnValue(testDirectory)
    stubEnv('NODE_ENV', 'development')
    stubEnv('CONFIG_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'))

    const initial = await loadAliasarrConfig()
    const config = {
      ...initial.config,
      connections: { ...initial.config.connections, radarrUrl: 'http://radarr:7878' },
    }
    const secrets = { ...initial.secrets, radarrApiKey: 'radarr-secret' }

    await saveAliasarrConfig(config, secrets, initial.revision)
    const loaded = await loadAliasarrConfig()

    expect(loaded.config.connections.radarrUrl).toBe('http://radarr:7878')
    expect(loaded.secrets.radarrApiKey).toBe('radarr-secret')
    expect(loaded.secrets.torznabApiKey).toBe('')
    expect(loaded.secretStatus).toMatchObject({ radarrApiKey: true, torznabApiKey: false, sonarrApiKey: false })
    expect(loaded.encrypted).toBe(true)
  })

  it('persists configuration across reads and protects revisions', async () => {
    testDirectory = await mkdtemp(path.join(tmpdir(), 'aliasarr-config-'))
    jest.spyOn(process, 'cwd').mockReturnValue(testDirectory)
    stubEnv('NODE_ENV', 'development')
    stubEnv('CONFIG_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'))

    const initial = await loadAliasarrConfig()
    expect(initial).toMatchObject({ exists: false, configured: true, storage: 'local-file', revision: null })

    const config = {
      ...initial.config,
      connections: { ...initial.config.connections, prowlarrUrl: 'http://prowlarr:9696' },
    }
    const secrets = { ...initial.secrets, torznabApiKey: '0123456789abcdef', prowlarrApiKey: 'secret-prowlarr-key' }
    const saved = await saveAliasarrConfig(config, secrets, initial.revision)
    const loaded = await loadAliasarrConfig()

    expect(loaded.revision).toBe(saved.revision)
    expect(loaded.config.connections.prowlarrUrl).toBe('http://prowlarr:9696')
    const raw = await readFile(path.join(testDirectory, LOCAL_CONFIG_FILE), 'utf8')
    expect(raw).not.toContain('http://prowlarr:9696')
    expect(raw).not.toContain('secret-prowlarr-key')
    expect(JSON.parse(raw)).toMatchObject({
      revision: saved.revision,
      encryptedConfig: { algorithm: 'A256GCM', version: 1 },
    })

    await expect(saveAliasarrConfig(config, secrets, 'stale-revision')).rejects.toBeInstanceOf(ConfigRevisionConflictError)
  })
})
