import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getEnv } from '@/utils/env'
import { verifyToken } from '@/utils/jwt'

import { AUTH_TOKEN_NAME } from './constants'

export interface AuthUser {
  username: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const authInfo = cookieStore.get(AUTH_TOKEN_NAME)
  if (!authInfo) return null

  const payload = await verifyToken(authInfo.value)
  if (!payload?.authenticated) return null

  const env = getEnv()
  const username = typeof payload.username === 'string' ? payload.username : env.ACCESS_USERNAME
  if (!username) return null
  return { username }
}

export async function validateCookie() {
  return Boolean(await getAuthUser())
}

export interface CheckAccessOptions {
  loginUrl?: string
  redirectUrl?: string
  isApiRouter?: boolean
}

export async function checkAccess(options?: CheckAccessOptions) {
  const { redirectUrl = '/admin', loginUrl = '/login', isApiRouter = true } = options || {}
  if (await validateCookie()) return true
  if (isApiRouter) return false
  const url = redirectUrl ? `${loginUrl}?redirectUrl=${encodeURIComponent(redirectUrl)}` : loginUrl
  redirect(url)
}

export async function checkUnAccess(options?: { redirectUrl?: string; isApiRouter?: boolean }) {
  const { redirectUrl = '/admin', isApiRouter = true } = options || {}
  if (!(await validateCookie())) return true
  if (isApiRouter) return false
  redirect(redirectUrl)
}
