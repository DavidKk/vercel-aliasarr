import { decryptConfigPayload, encryptConfigPayload } from '../../services/config/crypto'

describe('encrypted configuration', () => {
  const key = Buffer.alloc(32, 3).toString('base64')

  it('round-trips without storing plaintext', () => {
    const value = { url: 'http://sonarr:8989', apiKey: 'sonarr-secret' }
    const encrypted = encryptConfigPayload(value, key)

    expect(JSON.stringify(encrypted)).not.toContain(value.url)
    expect(JSON.stringify(encrypted)).not.toContain(value.apiKey)
    expect(decryptConfigPayload(encrypted, key)).toEqual(value)
  })

  it('rejects the wrong key', () => {
    const encrypted = encryptConfigPayload({ apiKey: 'secret' }, key)
    expect(() => decryptConfigPayload(encrypted, Buffer.alloc(32, 4).toString('base64'))).toThrow(/Unable to decrypt/)
  })

  it('rejects modified ciphertext', () => {
    const encrypted = encryptConfigPayload({ apiKey: 'secret' }, key)
    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }
    expect(() => decryptConfigPayload(tampered, key)).toThrow(/Unable to decrypt/)
  })
})
