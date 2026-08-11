'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiShield } from 'react-icons/fi'

import { loadSignetSdk } from '@/lib/load-signet-sdk'
import { SIGNET_NEXT_COOKIE, SIGNET_OAUTH_STATE_COOKIE, SIGNET_REMEMBER_ME_COOKIE } from '@/services/auth/constants'

interface SignetLoginButtonProps {
  authCenterOrigin: string
  moduleUrl: string
  redirectUrl: string
  rememberMe: boolean
}

export function SignetLoginButton({ authCenterOrigin, moduleUrl, redirectUrl, rememberMe }: SignetLoginButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const ensureSdk = useCallback(() => loadSignetSdk(moduleUrl), [moduleUrl])

  useEffect(() => {
    let cancelled = false
    void ensureSdk()
      .then(() => {
        if (!cancelled) setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load Signet SDK')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ensureSdk])

  async function startSignetLogin() {
    setLoading(true)
    setError(null)
    try {
      const sdk = await ensureSdk()
      const state = crypto.randomUUID()
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      const cookieOptions = `Path=/; Max-Age=600; SameSite=Lax${secure}`
      document.cookie = `${SIGNET_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; ${cookieOptions}`
      document.cookie = `${SIGNET_NEXT_COOKIE}=${encodeURIComponent(redirectUrl)}; ${cookieOptions}`
      document.cookie = `${SIGNET_REMEMBER_ME_COOKIE}=${rememberMe ? '1' : '0'}; ${cookieOptions}`
      const callbackUrl = `${window.location.origin}/auth/signet/callback`
      window.location.assign(sdk.buildLoginUrl({ authCenterOrigin, redirectUrl: callbackUrl, state }))
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to start Signet login')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void startSignetLogin()}
        disabled={loading || Boolean(error)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-app-border bg-app-subtle/70 text-sm font-semibold text-app-text transition hover:border-app-muted hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-55"
      >
        <FiShield className="h-4 w-4" aria-hidden />
        {loading ? 'Preparing Signet…' : 'Continue with Signet'}
      </button>
      {error ? (
        <p role="alert" className="text-center text-xs leading-5 text-app-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
