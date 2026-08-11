export type SignetClientModule = {
  buildLoginUrl(options: { authCenterOrigin: string; redirectUrl: string; state?: string }): string
  parseLoginCallbackParams(input: URLSearchParams | string): { token: string | null; state: string | null }
  verifyTokenAtAuthCenter(options: {
    authCenterOrigin: string
    token: string
    audience?: string
    fetch?: typeof fetch
  }): Promise<{ ok: boolean; status: number; response: Record<string, unknown> | null; error?: string }>
}

const signetLoads = new Map<string, Promise<SignetClientModule>>()

async function importSignetModule(moduleUrl: string): Promise<SignetClientModule> {
  if (typeof window !== 'undefined') {
    return import(/* webpackIgnore: true */ moduleUrl) as Promise<SignetClientModule>
  }

  const response = await fetch(moduleUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Signet SDK request failed (${response.status})`)
  const source = await response.text()
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`
  return import(/* webpackIgnore: true */ dataUrl) as Promise<SignetClientModule>
}

export function loadSignetSdk(moduleUrl: string): Promise<SignetClientModule> {
  const cached = signetLoads.get(moduleUrl)
  if (cached) return cached
  const pending = importSignetModule(moduleUrl).catch((error: unknown) => {
    signetLoads.delete(moduleUrl)
    throw error
  })
  signetLoads.set(moduleUrl, pending)
  return pending
}
