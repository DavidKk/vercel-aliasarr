export interface MemoryCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

interface Entry {
  expiresAt: number;
  value: unknown;
}

export function createMemoryCache(): MemoryCache {
  const store = new Map<string, Entry>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}
