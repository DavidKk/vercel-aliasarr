import { mkdtemp, readFile, rm } from 'node:fs/promises'
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

import { GET, POST } from '../../app/api/config/server-key/route'
import { loadAliasarrConfig, LOCAL_CONFIG_FILE } from '../../services/config'
import { resetEnvCache } from '../../utils/env'

let testDirectory: string | null = null

afterEach(async () => {
  jest.restoreAllMocks()
  unstubAllEnvs()
  resetEnvCache()
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true })
  testDirectory = null
})

describe('server API key route', () => {
  it('generates, encrypts, and returns the managed key on demand', async () => {
    testDirectory = await mkdtemp(path.join(tmpdir(), 'aliasarr-server-key-'))
    jest.spyOn(process, 'cwd').mockReturnValue(testDirectory)
    stubEnv('NODE_ENV', 'development')
    stubEnv('CONFIG_ENCRYPTION_KEY', Buffer.alloc(32, 11).toString('base64'))
    resetEnvCache()

    const generateResponse = await POST(
      new NextRequest('http://localhost/api/config/server-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: null }),
      }),
      { params: Promise.resolve({}) }
    )
    const generated = await generateResponse.json()
    const stored = await loadAliasarrConfig()
    const raw = await readFile(path.join(testDirectory, LOCAL_CONFIG_FILE), 'utf8')

    expect(generateResponse.status).toBe(200)
    expect(generateResponse.headers.get('Cache-Control')).toContain('no-store')
    expect(generated.data.apiKey).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(stored.secrets.torznabApiKey).toBe(generated.data.apiKey)
    expect(raw).not.toContain(generated.data.apiKey)

    const copyResponse = await GET(new NextRequest('http://localhost/api/config/server-key'), { params: Promise.resolve({}) })
    const copied = await copyResponse.json()
    expect(copyResponse.status).toBe(200)
    expect(copyResponse.headers.get('Cache-Control')).toContain('no-store')
    expect(copied.data.apiKey).toBe(generated.data.apiKey)
  })
})
