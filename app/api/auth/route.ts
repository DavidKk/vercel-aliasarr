import { serialize } from 'cookie'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, jsonUnauthorized } from '@/initializer/response'
import { verify2fa } from '@/services/2fa'
import { AUTH_TOKEN_NAME, SIGNET_2FA_PENDING_COOKIE } from '@/services/auth/constants'
import { isSignetPendingClaims } from '@/services/auth/signet-sdk'
import { getEnv } from '@/utils/env'
import { generateToken, getLoginJwtExpiresIn, jwtExpiresInToMaxAgeSeconds, verifyToken } from '@/utils/jwt'
import { timingSafeStringEqual } from '@/utils/timing-safe'

export const runtime = 'nodejs'

function applySessionCookies(response: NextResponse, authToken: string, rememberMe: boolean, expiresIn: string) {
  response.cookies.set(AUTH_TOKEN_NAME, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
    ...(rememberMe ? { maxAge: jwtExpiresInToMaxAgeSeconds(expiresIn) } : {}),
  })
  response.cookies.set(SIGNET_2FA_PENDING_COOKIE, '', { path: '/', maxAge: 0 })
}

export const POST = api(async (req: NextRequest) => {
  const env = getEnv()

  let body: { username?: string; password?: string; token?: string; rememberMe?: boolean; signet2fa?: boolean }
  try {
    body = await req.json()
  } catch {
    return jsonInvalidParameters('Invalid JSON body')
  }

  // Signet SSO step-up: pending cookie + TOTP only.
  if (body.signet2fa === true) {
    if (!env.ACCESS_2FA_SECRET) {
      return jsonInvalidParameters('Local 2FA is not configured')
    }
    const pendingRaw = req.cookies.get(SIGNET_2FA_PENDING_COOKIE)?.value
    if (!pendingRaw) return jsonUnauthorized('Signet session expired. Please sign in again.')

    const pendingPayload = (await verifyToken(pendingRaw)) as Record<string, unknown> | null
    if (!isSignetPendingClaims(pendingPayload)) {
      const response = NextResponse.json({ code: 2000, message: 'Signet session expired. Please sign in again.', data: null }, { status: 401 })
      response.cookies.set(SIGNET_2FA_PENDING_COOKIE, '', { path: '/', maxAge: 0 })
      return response
    }

    const ok = body.token && (await verify2fa({ token: body.token, secret: env.ACCESS_2FA_SECRET }))
    if (!ok) return jsonUnauthorized('Invalid authenticator code')

    const expiresIn = getLoginJwtExpiresIn(pendingPayload.rememberMe)
    const authToken = await generateToken({ authenticated: true, provider: 'signet', sub: pendingPayload.sub, username: pendingPayload.username }, expiresIn)
    const response = NextResponse.json({ code: 0, message: 'ok', data: { ok: true, redirectUrl: pendingPayload.nextPath } })
    applySessionCookies(response, authToken, pendingPayload.rememberMe, expiresIn)
    return response
  }

  if (!env.ACCESS_USERNAME || !env.ACCESS_PASSWORD) {
    return jsonInvalidParameters('Login is not configured (ACCESS_USERNAME / ACCESS_PASSWORD)')
  }

  const username = body.username?.trim() ?? ''
  const password = body.password ?? ''
  if (!username || !password) {
    return jsonInvalidParameters('Username and password are required')
  }

  if (!timingSafeStringEqual(username, env.ACCESS_USERNAME) || !timingSafeStringEqual(password, env.ACCESS_PASSWORD)) {
    return jsonUnauthorized('Invalid username or password')
  }

  if (env.ACCESS_2FA_SECRET) {
    const ok = body.token && (await verify2fa({ token: body.token, secret: env.ACCESS_2FA_SECRET }))
    if (!ok) return jsonUnauthorized('Invalid username or password')
  }

  const rememberMe = body.rememberMe === true
  const expiresIn = getLoginJwtExpiresIn(rememberMe)
  const authToken = await generateToken({ authenticated: true, username, provider: 'local' }, expiresIn)
  return jsonSuccess(
    { ok: true },
    {
      headers: new Headers({
        'Set-Cookie': serialize(AUTH_TOKEN_NAME, authToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          ...(rememberMe ? { maxAge: jwtExpiresInToMaxAgeSeconds(expiresIn) } : {}),
        }),
      }),
    }
  )
})

export const DELETE = api(async () => {
  const response = NextResponse.json({ code: 0, message: 'ok', data: { ok: true } })
  response.cookies.set(AUTH_TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
  })
  response.cookies.set(SIGNET_2FA_PENDING_COOKIE, '', { path: '/', maxAge: 0 })
  return response
})
