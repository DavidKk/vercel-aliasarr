import { serialize } from 'cookie'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { loadSignetSdk } from '@/lib/load-signet-sdk'
import {
  AUTH_TOKEN_NAME,
  SIGNET_2FA_PENDING_COOKIE,
  SIGNET_2FA_PENDING_TTL,
  SIGNET_NEXT_COOKIE,
  SIGNET_OAUTH_STATE_COOKIE,
  SIGNET_REMEMBER_ME_COOKIE,
} from '@/services/auth/constants'
import { getSignetAudience, getSignetAuthCenterOrigin, getSignetSdkModuleUrl, isLocal2faEnabled, isSignetUserAllowed } from '@/services/auth/signet-sdk'
import { generateToken, getLoginJwtExpiresIn, jwtExpiresInToMaxAgeSeconds } from '@/utils/jwt'

export const runtime = 'nodejs'

function safeRelativePath(raw: string | undefined, fallback = '/admin'): string {
  if (!raw) return fallback
  let path = raw
  try {
    path = decodeURIComponent(raw)
  } catch {
    path = raw
  }
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback
}

function clearFlowCookies(headers: Headers) {
  for (const name of [SIGNET_OAUTH_STATE_COOKIE, SIGNET_NEXT_COOKIE, SIGNET_REMEMBER_ME_COOKIE]) {
    headers.append('Set-Cookie', serialize(name, '', { path: '/', maxAge: 0 }))
  }
}

function redirectWithError(origin: string, code: string, redirectUrl: string, headers: Headers) {
  const target = new URL('/login', origin)
  target.searchParams.set('redirectUrl', redirectUrl)
  target.searchParams.set('signetError', code)
  clearFlowCookies(headers)
  return NextResponse.redirect(target, { headers })
}

export async function GET(request: Request) {
  const authCenterOrigin = getSignetAuthCenterOrigin()
  const moduleUrl = getSignetSdkModuleUrl()
  if (!authCenterOrigin || !moduleUrl) return new NextResponse('Signet is not configured.', { status: 503 })

  const url = new URL(request.url)
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(SIGNET_OAUTH_STATE_COOKIE)?.value
  const nextPath = safeRelativePath(cookieStore.get(SIGNET_NEXT_COOKIE)?.value)
  const rememberMe = cookieStore.get(SIGNET_REMEMBER_ME_COOKIE)?.value === '1'
  const headers = new Headers()

  try {
    const signet = await loadSignetSdk(moduleUrl)
    const { token, state } = signet.parseLoginCallbackParams(url.searchParams)
    if (!state || !expectedState || state !== expectedState) return redirectWithError(url.origin, 'invalid_state', nextPath, headers)
    if (!token) return redirectWithError(url.origin, 'missing_token', nextPath, headers)

    const verified = await signet.verifyTokenAtAuthCenter({ authCenterOrigin, token, audience: getSignetAudience() })
    if (!verified.ok || !verified.response) return redirectWithError(url.origin, 'verify_failed', nextPath, headers)

    const data = verified.response.data as Record<string, unknown> | undefined
    const user = data?.user as Record<string, unknown> | undefined
    const claims = data?.claims as Record<string, unknown> | undefined
    const username =
      (typeof user?.username === 'string' && user.username.trim()) ||
      (typeof claims?.preferred_username === 'string' && claims.preferred_username.trim()) ||
      (typeof claims?.username === 'string' && claims.username.trim()) ||
      ''
    const subject = typeof user?.sub === 'string' && user.sub.trim() ? user.sub.trim() : undefined
    if (!isSignetUserAllowed({ username, sub: subject })) {
      return redirectWithError(url.origin, 'not_allowed', nextPath, headers)
    }

    const displayName = username || subject || 'Signet user'
    const sub = subject ?? displayName
    clearFlowCookies(headers)

    // Local 2FA covers Signet via step-up: pending cookie → OTP on /login.
    if (isLocal2faEnabled()) {
      const pendingToken = await generateToken(
        {
          signetPending: true,
          provider: 'signet',
          username: displayName,
          sub,
          rememberMe,
          nextPath,
        },
        SIGNET_2FA_PENDING_TTL
      )
      headers.append(
        'Set-Cookie',
        serialize(SIGNET_2FA_PENDING_COOKIE, pendingToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: jwtExpiresInToMaxAgeSeconds(SIGNET_2FA_PENDING_TTL),
        })
      )
      const target = new URL('/login', url.origin)
      target.searchParams.set('redirectUrl', nextPath)
      target.searchParams.set('signet2fa', '1')
      return NextResponse.redirect(target, { headers })
    }

    const expiresIn = getLoginJwtExpiresIn(rememberMe)
    const sessionToken = await generateToken({ authenticated: true, provider: 'signet', sub, username: displayName }, expiresIn)
    headers.append(
      'Set-Cookie',
      serialize(AUTH_TOKEN_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        ...(rememberMe ? { maxAge: jwtExpiresInToMaxAgeSeconds(expiresIn) } : {}),
      })
    )
    // Ensure any leftover pending cookie is cleared.
    headers.append('Set-Cookie', serialize(SIGNET_2FA_PENDING_COOKIE, '', { path: '/', maxAge: 0 }))
    return NextResponse.redirect(new URL(nextPath, url.origin), { headers })
  } catch {
    return redirectWithError(url.origin, 'sdk_error', nextPath, headers)
  }
}
