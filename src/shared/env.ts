import { z } from "zod";

const EnvSchema = z.object({
  TORZNAB_API_KEY: z.string().min(16),
  PROWLARR_URL: z.string().url(),
  PROWLARR_API_KEY: z.string().min(8),
  PROWLARR_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PROWLARR_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  PROWLARR_SONARR_URL: z.string().url().optional(),
  ALIAS_DATA_DIR: z.string().default("data/aliases"),
  MAX_TITLES: z.coerce.number().int().positive().default(3),
  MAX_QUERY_FORMATS_PER_TITLE: z.coerce.number().int().positive().default(2),
  MAX_PROWLARR_QUERIES: z.coerce.number().int().positive().default(6),
  SEARCH_RESULT_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  // next dev may hot-reload .env.local; avoid sticky stale values in development
  if (cached && process.env.NODE_ENV === "production") return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

/** test-only */
export function resetEnvCache(): void {
  cached = null;
}
