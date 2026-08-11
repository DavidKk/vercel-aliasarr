import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { z } from 'zod'

const ALGORITHM = 'aes-256-gcm'
const AAD = Buffer.from('aliasarr:encrypted-config:v1', 'utf8')

export const EncryptedConfigPayloadSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal('A256GCM'),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  tag: z.string().min(1),
})

export type EncryptedConfigPayload = z.infer<typeof EncryptedConfigPayloadSchema>

function decodeKey(value: string): Buffer {
  const raw = value.trim()
  const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('CONFIG_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64 hexadecimal characters')
  }
  return key
}

export function encryptConfigPayload(value: unknown, encryptionKey: string): EncryptedConfigPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, decodeKey(encryptionKey), iv)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return {
    version: 1,
    algorithm: 'A256GCM',
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptConfigPayload<T>(payload: EncryptedConfigPayload, encryptionKey: string): T {
  try {
    const parsed = EncryptedConfigPayloadSchema.parse(payload)
    const decipher = createDecipheriv(ALGORITHM, decodeKey(encryptionKey), Buffer.from(parsed.iv, 'base64'))
    decipher.setAAD(AAD)
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(parsed.ciphertext, 'base64')), decipher.final()])
    return JSON.parse(plaintext.toString('utf8')) as T
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CONFIG_ENCRYPTION_KEY')) throw error
    throw new Error('Unable to decrypt Aliasarr configuration; verify CONFIG_ENCRYPTION_KEY')
  }
}
