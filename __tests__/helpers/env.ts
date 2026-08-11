const envOriginals = new Map<string, string | undefined>()
const globalOriginals = new Map<string, unknown>()

/** Vitest-compatible env stub for Jest. */
export function stubEnv(key: string, value: string): void {
  if (!envOriginals.has(key)) envOriginals.set(key, process.env[key])
  process.env[key] = value
}

export function unstubAllEnvs(): void {
  for (const [key, value] of envOriginals) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  envOriginals.clear()
}

/** Vitest-compatible global stub for Jest. */
export function stubGlobal(name: string, value: unknown): void {
  const target = globalThis as Record<string, unknown>
  if (!globalOriginals.has(name)) globalOriginals.set(name, target[name])
  target[name] = value
}

export function unstubAllGlobals(): void {
  const target = globalThis as Record<string, unknown>
  for (const [name, value] of globalOriginals) {
    target[name] = value
  }
  globalOriginals.clear()
}
