import { z } from 'zod'

const optionalNonEmpty = z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().min(1).optional())
const optionalUrl = z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().url().optional())
const optionalPositiveIntList = z.preprocess(
  (value) => {
    if (value == null || value === '') return undefined
    if (Array.isArray(value)) return value
    return String(value)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  },
  z
    .array(z.coerce.number().int().positive())
    .transform((values) => [...new Set(values)])
    .optional()
)

const EnvSchema = z.object({
  PROWLARR_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  PROWLARR_MAX_CONCURRENCY: z.coerce.number().int().positive().default(6),
  PROWLARR_INDEXER_IDS: optionalPositiveIntList,
  PROWLARR_TV_INDEXER_IDS: optionalPositiveIntList,
  PROWLARR_MOVIE_INDEXER_IDS: optionalPositiveIntList,
  JACKETT_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  MAX_TITLES: z.coerce.number().int().positive().default(3),
  MAX_QUERY_FORMATS_PER_TITLE: z.coerce.number().int().positive().default(2),
  MAX_PROWLARR_QUERIES: z.coerce.number().int().positive().default(6),
  SEARCH_RESULT_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.string().default('info'),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalNonEmpty,
  CONFIG_ENCRYPTION_KEY: optionalNonEmpty,
  // Compatibility with Vercel's older KV-prefixed integration variables.
  KV_REST_API_URL: optionalUrl,
  KV_REST_API_TOKEN: optionalNonEmpty,
  ACCESS_USERNAME: optionalNonEmpty,
  ACCESS_PASSWORD: optionalNonEmpty,
  ACCESS_2FA_SECRET: optionalNonEmpty,
  JWT_SECRET: optionalNonEmpty,
  JWT_EXPIRES_IN: z.string().default('7d'),
  SIGNET_SDK_URL: optionalNonEmpty,
  NEXT_PUBLIC_SIGNET_SDK_URL: optionalNonEmpty,
  /** Comma-separated Signet usernames or subject ids allowed as Admin. Falls back to ACCESS_USERNAME when unset. */
  SIGNET_ALLOWED_USERS: z.preprocess(
    (value) => {
      if (value == null || value === '') return undefined
      if (Array.isArray(value)) return value
      return String(value)
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    },
    z
      .array(z.string().min(1))
      .transform((values) => [...new Set(values)])
      .optional()
  ),
  ALIAS_CACHE_TTL_MS: z.coerce.number().int().positive().default(86_400_000),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached && process.env.NODE_ENV === 'production') return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`)
  }
  cached = parsed.data
  return cached
}

/** test-only */
export function resetEnvCache(): void {
  cached = null
}

export function requireAuthEnv(): { username: string; password: string } {
  const env = getEnv()
  if (!env.ACCESS_USERNAME || !env.ACCESS_PASSWORD) {
    throw new Error('ACCESS_USERNAME and ACCESS_PASSWORD must be configured')
  }
  return {
    username: env.ACCESS_USERNAME,
    password: env.ACCESS_PASSWORD,
  }
}
