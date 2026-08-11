import type { Metadata } from 'next'

import { LoginForm } from '@/app/login/LoginForm'
import { LoginHero } from '@/components/login-hero'
import { checkUnAccess } from '@/services/auth/access'
import { getSignetAuthCenterOrigin, getSignetSdkModuleUrl, isSignetLoginAvailable } from '@/services/auth/signet-sdk'
import { getEnv } from '@/utils/env'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to the Aliasarr admin console.',
  robots: { index: false, follow: false },
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirectUrl?: string; signetError?: string; signet2fa?: string }> }) {
  const params = await searchParams
  const redirectUrl = params.redirectUrl || '/admin'
  const signet2fa = params.signet2fa === '1'
  await checkUnAccess({ redirectUrl, isApiRouter: false })

  let enable2FA = false
  try {
    enable2FA = Boolean(getEnv().ACCESS_2FA_SECRET)
  } catch {
    enable2FA = false
  }
  const signetAvailable = isSignetLoginAvailable()
  const signetAuthCenterOrigin = signetAvailable ? getSignetAuthCenterOrigin() : null
  const signetSdkModuleUrl = signetAvailable ? getSignetSdkModuleUrl() : null

  return (
    <div className="grid min-h-[min(620px,calc(100vh-180px))] items-center gap-10 py-4 lg:grid-cols-[1fr_0.85fr] lg:py-8">
      <LoginHero />
      <div className="flex justify-center lg:justify-end">
        <LoginForm
          enable2FA={enable2FA}
          redirectUrl={redirectUrl}
          signet2fa={signet2fa}
          signetAuthCenterOrigin={signetAuthCenterOrigin}
          signetError={params.signetError}
          signetSdkModuleUrl={signetSdkModuleUrl}
        />
      </div>
    </div>
  )
}
