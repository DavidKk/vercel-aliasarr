/// <reference types="jest" />

import {
  AliasarrConnectionsSchema,
  AliasarrSecretsSchema,
  customHeaderNames,
  customHeadersRecord,
  defaultAliasarrSecrets,
  mergeHeaderDrafts,
  migrateLegacyConnectionHeaders,
} from '../../services/config'

describe('custom headers secrets', () => {
  it('builds a fetch header map and lets later duplicates win', () => {
    expect(
      customHeadersRecord([
        { name: 'CF-Access-Client-Id', value: 'id' },
        { name: ' CF-Access-Client-Secret ', value: 'secret' },
        { name: 'CF-Access-Client-Id', value: 'id-2' },
      ])
    ).toEqual({
      'CF-Access-Client-Id': 'id-2',
      'CF-Access-Client-Secret': 'secret',
    })
  })

  it('defaults missing header lists on secrets, not connections', () => {
    expect(AliasarrConnectionsSchema.parse({})).not.toHaveProperty('prowlarrHeaders')
    expect(defaultAliasarrSecrets().prowlarrHeaders).toEqual([])
    expect(AliasarrSecretsSchema.parse({}).jackettHeaders).toEqual([])
  })

  it('drops incomplete header rows and duplicate names when parsing secrets', () => {
    const secrets = AliasarrSecretsSchema.parse({
      prowlarrHeaders: [
        { name: 'CF-Access-Client-Id', value: 'id' },
        { name: '', value: 'x' },
        { name: 'Only-Name', value: '' },
        { name: '  Keep  ', value: 'ok' },
        { name: 'keep', value: 'ignored-duplicate' },
      ],
    })
    expect(secrets.prowlarrHeaders).toEqual([
      { name: 'CF-Access-Client-Id', value: 'id' },
      { name: 'Keep', value: 'ok' },
    ])
  })

  it('merges drafts while keeping blank configured values', () => {
    const merged = mergeHeaderDrafts(
      [
        { name: 'CF-Access-Client-Id', value: 'id' },
        { name: 'CF-Access-Client-Secret', value: 'secret' },
      ],
      [
        { name: 'CF-Access-Client-Id', value: null },
        { name: 'CF-Access-Client-Secret', value: 'rotated' },
        { name: 'X-Extra', value: '' },
      ]
    )
    expect(merged).toEqual([
      { name: 'CF-Access-Client-Id', value: 'id' },
      { name: 'CF-Access-Client-Secret', value: 'rotated' },
    ])
  })

  it('rejects duplicate draft names', () => {
    expect(() =>
      mergeHeaderDrafts(
        [],
        [
          { name: 'CF-Access-Client-Id', value: 'a' },
          { name: 'cf-access-client-id', value: 'b' },
        ]
      )
    ).toThrow(/Duplicate custom header/i)
  })

  it('exposes header names without values', () => {
    const secrets = AliasarrSecretsSchema.parse({
      prowlarrHeaders: [{ name: 'CF-Access-Client-Id', value: 'secret-value' }],
    })
    expect(customHeaderNames(secrets)).toEqual({
      prowlarrHeaders: ['CF-Access-Client-Id'],
      jackettHeaders: [],
      sonarrHeaders: [],
      radarrHeaders: [],
    })
  })

  it('migrates legacy connection headers into secrets once', () => {
    const migrated = migrateLegacyConnectionHeaders(
      {
        prowlarrHeaders: [{ name: 'CF-Access-Client-Id', value: 'from-connections' }],
      },
      defaultAliasarrSecrets()
    )
    expect(migrated.prowlarrHeaders).toEqual([{ name: 'CF-Access-Client-Id', value: 'from-connections' }])
  })
})
