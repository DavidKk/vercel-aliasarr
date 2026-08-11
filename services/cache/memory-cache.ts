export interface MemoryCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
  clear?(): Promise<void>
}

interface Entry {
  expiresAt: number
  value: unknown
}

export function createMemoryCache(options?: { now?: () => number }): MemoryCache {
  const store = new Map<string, Entry>()
  const now = options?.now ?? (() => Date.now())

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key)
      if (!entry) return null
      if (now() > entry.expiresAt) {
        store.delete(key)
        return null
      }
      return entry.value as T
    },
    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      store.set(key, { value, expiresAt: now() + ttlMs })
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
    async clear(): Promise<void> {
      store.clear()
    },
  }
}
