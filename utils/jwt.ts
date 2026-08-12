import { type JWTPayload, jwtVerify, SignJWT } from 'jose'

import { getEnv } from '@/utils/env'

const DEV_JWT_FALLBACK = 'aliasarr-default-jwt-secret'

/**
 * Resolve JWT signing secret.
 * Prefer JWT_SECRET, then ACCESS_PASSWORD. Production never uses a hardcoded fallback.
 */
export function resolveJwtSecret(): string {
  const env = getEnv()
  const secret = env.JWT_SECRET || env.ACCESS_PASSWORD
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET or ACCESS_PASSWORD must be configured in production')
  }
  return DEV_JWT_FALLBACK
}

export async function generateToken(payload: object, expiresIn?: string): Promise<string> {
  const env = getEnv()
  const expiration = expiresIn ?? env.JWT_EXPIRES_IN
  const resolvedExpiresIn = /^\d+$/.test(expiration) ? Number(expiration) : expiration
  const secretKey = new TextEncoder().encode(resolveJwtSecret())

  return new SignJWT({ ...(payload as Record<string, unknown>) }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setExpirationTime(resolvedExpiresIn).sign(secretKey)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(resolveJwtSecret())
    const { payload } = await jwtVerify(token, secretKey)
    return payload
  } catch {
    return null
  }
}

export function getLoginJwtExpiresIn(rememberMe: boolean): string {
  const env = getEnv()
  return rememberMe ? env.JWT_EXPIRES_IN : '12h'
}

export function jwtExpiresInToMaxAgeSeconds(expiresIn: string): number {
  const m = /^(\d+)\s*([dhms])$/i.exec(expiresIn.trim())
  if (!m) return 86400
  const amount = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  switch (unit) {
    case 'd':
      return amount * 86400
    case 'h':
      return amount * 3600
    case 'm':
      return amount * 60
    case 's':
      return amount
    default:
      return 86400
  }
}
