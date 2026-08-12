import { getEnv } from '@/utils/env'

const SIGNET_AUDIENCE = 'aliasarr'

export function getSignetSdkUrl(): string {
  const env = getEnv()
  return env.SIGNET_SDK_URL?.trim() || env.NEXT_PUBLIC_SIGNET_SDK_URL?.trim() || ''
}

export function isSignetLoginEnabled(): boolean {
  return Boolean(getSignetSdkUrl())
}

export function getSignetAudience(): string {
  return SIGNET_AUDIENCE
}

export function getSignetAuthCenterOrigin(): string | null {
  const sdkUrl = getSignetSdkUrl()
  if (!sdkUrl) return null
  try {
    return new URL(sdkUrl).origin
  } catch {
    return null
  }
}

export function getSignetSdkModuleUrl(): string | null {
  const configured = getSignetSdkUrl()
  if (!configured) return null
  try {
    const url = new URL(configured)
    if (url.pathname.replace(/\/+$/, '').endsWith('signet-client.mjs')) return url.toString()
    return `${configured.replace(/\/+$/, '')}/sdk/signet-client.mjs`
  } catch {
    return null
  }
}

/** Local TOTP is configured — password login and Signet SSO both require it (Signet via step-up). */
export function isLocal2faEnabled(): boolean {
  return Boolean(getEnv().ACCESS_2FA_SECRET)
}

/** True when Signet SSO should be offered on the login page (independent of local 2FA). */
export function isSignetLoginAvailable(): boolean {
  return isSignetLoginEnabled()
}

/**
 * Restrict Signet Admin access to an explicit allowlist, or ACCESS_USERNAME when unset.
 * Refuses open-tenant Signet → Admin when neither is configured.
 */
export function isSignetUserAllowed(identity: { username?: string; sub?: string }): boolean {
  const env = getEnv()
  const candidates = [identity.username, identity.sub].filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim().toLowerCase())
  if (!candidates.length) return false

  const allowed = env.SIGNET_ALLOWED_USERS?.map((value) => value.trim().toLowerCase()).filter(Boolean)
  if (allowed?.length) return candidates.some((value) => allowed.includes(value))

  if (env.ACCESS_USERNAME) {
    return candidates.includes(env.ACCESS_USERNAME.trim().toLowerCase())
  }

  return false
}

export type SignetPendingClaims = {
  signetPending: true
  provider: 'signet'
  username: string
  sub: string
  rememberMe: boolean
  nextPath: string
}

export function isSignetPendingClaims(payload: Record<string, unknown> | null | undefined): payload is SignetPendingClaims {
  return Boolean(
    payload &&
    payload.signetPending === true &&
    payload.provider === 'signet' &&
    typeof payload.username === 'string' &&
    typeof payload.sub === 'string' &&
    typeof payload.rememberMe === 'boolean' &&
    typeof payload.nextPath === 'string'
  )
}
