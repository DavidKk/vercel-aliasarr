'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useRef, useState } from 'react'

import { BrandLogo } from '@/components/brand-logo'
import { SignetLoginButton } from '@/components/signet-login-button'
import { Button, Checkbox, Input, OtpInput } from '@/components/ui'

export interface LoginFormProps {
  enable2FA?: boolean
  redirectUrl?: string
  signet2fa?: boolean
  signetAuthCenterOrigin?: string | null
  signetError?: string
  signetSdkModuleUrl?: string | null
}

export function LoginForm(props: Readonly<LoginFormProps>) {
  const { enable2FA = false, redirectUrl = '/admin', signet2fa = false, signetAuthCenterOrigin, signetError, signetSdkModuleUrl } = props
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(signetError ? signetErrorMessage(signetError) : signet2fa ? 'Enter the authenticator code to finish Signet sign-in.' : null)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const credentialsRef = useRef({ username: '', password: '', rememberMe: true })
  credentialsRef.current = { username, password, rememberMe }

  async function submitLogin(otpOverride?: string) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    const otp = otpOverride ?? token
    const { username: user, password: pass, rememberMe: remember } = credentialsRef.current
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signet2fa ? { signet2fa: true, token: otp } : { username: user, password: pass, token: otp, rememberMe: remember }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.code !== 0) {
        throw new Error(json?.message ?? 'Sign-in failed')
      }
      const next = typeof json?.data?.redirectUrl === 'string' ? json.data.redirectUrl : redirectUrl
      router.push(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      loadingRef.current = false
      setLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await submitLogin()
  }

  function onOtpComplete(code: string) {
    if (signet2fa) {
      void submitLogin(code)
      return
    }
    const { username: user, password: pass } = credentialsRef.current
    if (enable2FA && user.trim() && pass) void submitLogin(code)
  }

  return (
    <form onSubmit={onSubmit} className="ui-panel ui-fade-up w-full max-w-md space-y-5 p-6 sm:p-8">
      <div className="mb-7">
        <div className="mb-5">
          <BrandLogo size={56} priority />
        </div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-app-accent">Console access</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-app-ink">{signet2fa ? 'Confirm with 2FA' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm leading-6 text-app-muted">
          {signet2fa ? 'Signet verified your identity. Enter the authenticator code to finish signing in.' : 'Sign in to edit and publish your alias library.'}
        </p>
      </div>
      {signet2fa ? (
        <OtpInput value={token} required onChange={setToken} onComplete={onOtpComplete} />
      ) : (
        <>
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          {enable2FA ? <OtpInput value={token} required onChange={setToken} onComplete={onOtpComplete} /> : null}
          <div>
            <Checkbox label="Remember me on this device" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <p className="mt-1.5 pl-6 text-[0.65rem] leading-5 text-app-muted">
              {rememberMe ? 'Keeps the session after the browser closes.' : 'The session ends when the browser closes.'}
            </p>
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="rounded-xl border border-app-danger/20 bg-app-dangerSoft px-3 py-2.5 text-sm text-app-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Signing in…' : signet2fa ? 'Verify and continue' : 'Sign in'}
      </Button>
      {!signet2fa && signetAuthCenterOrigin && signetSdkModuleUrl ? (
        <>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-app-border/70" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-app-surface px-2 text-[0.65rem] text-app-muted">or</span>
            </div>
          </div>
          <SignetLoginButton authCenterOrigin={signetAuthCenterOrigin} moduleUrl={signetSdkModuleUrl} redirectUrl={redirectUrl} rememberMe={rememberMe} />
        </>
      ) : null}
    </form>
  )
}

function signetErrorMessage(code: string): string {
  if (code === 'invalid_state') return 'Signet session validation failed. Please try again.'
  if (code === 'missing_token') return 'Signet did not return a login token.'
  if (code === 'verify_failed') return 'Signet could not verify this login.'
  if (code === 'sdk_error') return 'The Signet SDK could not complete the login.'
  if (code === 'not_allowed') return 'This Signet account is not allowed to access Admin.'
  return 'Signet login failed.'
}
