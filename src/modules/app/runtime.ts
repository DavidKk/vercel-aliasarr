import path from "node:path";
import { getEnv, type Env } from "@/shared/env";
import { createMemoryCache, type MemoryCache } from "@/modules/cache/memory-cache";
import {
  loadAliasRepository,
  type AliasRepository,
  type MediaTitles,
} from "@/modules/media/alias-repository";
import { buildIdentityFromTorznab } from "@/modules/media/identity";
import { resolveTitles } from "@/modules/media/title-resolver";
import {
  createProwlarrClient,
  type ProwlarrClient,
} from "@/modules/prowlarr/client";
import { generateQueries } from "@/modules/search/query-generator";
import { createSearchService } from "@/modules/search/search-service";
import type { TorznabRequest } from "@/modules/torznab/types";

export interface AppRuntime {
  env: Env;
  repo: AliasRepository;
  prowlarr: ProwlarrClient;
  cache: MemoryCache;
  searchService: ReturnType<typeof createSearchService>;
  resolveForRequest(req: TorznabRequest): Promise<{
    titles: string[];
    media: MediaTitles | null;
  }>;
}

let singleton: AppRuntime | null = null;

export async function getAppRuntime(): Promise<AppRuntime> {
  if (singleton) return singleton;

  const env = getEnv();
  const aliasDir = path.isAbsolute(env.ALIAS_DATA_DIR)
    ? env.ALIAS_DATA_DIR
    : path.join(process.cwd(), env.ALIAS_DATA_DIR);
  const repo = await loadAliasRepository(aliasDir);
  const prowlarr = createProwlarrClient({
    baseUrl: env.PROWLARR_URL,
    apiKey: env.PROWLARR_API_KEY,
    timeoutMs: env.PROWLARR_TIMEOUT_MS,
    mapOptions: env.PROWLARR_SONARR_URL
      ? {
          sonarrBaseUrl: env.PROWLARR_SONARR_URL,
          upstreamBaseUrl: env.PROWLARR_URL,
        }
      : undefined,
  });
  const cache = createMemoryCache();

  async function resolveForRequest(req: TorznabRequest) {
    const identity = buildIdentityFromTorznab(req);
    const media =
      identity.tvdbId != null ? repo.findByTvdbId(identity.tvdbId) : null;
    const resolved = resolveTitles(identity, media, {
      maxTitles: env.MAX_TITLES,
      enableScriptConvert: true,
    });
    return { titles: resolved.titles, media };
  }

  const searchService = createSearchService({
    resolveTitlesForRequest: async (req) => {
      const { titles } = await resolveForRequest(req);
      return { titles };
    },
    generateQueries,
    prowlarr,
    maxConcurrency: env.PROWLARR_MAX_CONCURRENCY,
    resultLimit: env.SEARCH_RESULT_LIMIT,
    maxFormatsPerTitle: env.MAX_QUERY_FORMATS_PER_TITLE,
    maxQueries: env.MAX_PROWLARR_QUERIES,
    cache,
  });

  singleton = { env, repo, prowlarr, cache, searchService, resolveForRequest };
  return singleton;
}

/** test-only */
export function resetAppRuntime(): void {
  singleton = null;
}
