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
let envFingerprint: string | null = null;

function fingerprint(env: Env): string {
  return [
    env.PROWLARR_URL,
    env.PROWLARR_API_KEY,
    env.PROWLARR_SONARR_URL ?? "",
    env.ALIAS_DATA_DIR,
    env.MAX_TITLES,
    env.MAX_PROWLARR_QUERIES,
  ].join("|");
}

export async function getAppRuntime(): Promise<AppRuntime> {
  const env = getEnv();
  const fp = fingerprint(env);
  const aliasDir = path.isAbsolute(env.ALIAS_DATA_DIR)
    ? env.ALIAS_DATA_DIR
    : path.join(process.cwd(), env.ALIAS_DATA_DIR);

  // Always reload YAML aliases so new media files are picked up without restart.
  const repo = await loadAliasRepository(aliasDir);

  if (singleton && envFingerprint === fp) {
    singleton.repo = repo;
    const current = singleton;
    current.resolveForRequest = async (req: TorznabRequest) => {
      const identity = buildIdentityFromTorznab(req);
      const media =
        identity.tvdbId != null ? repo.findByTvdbId(identity.tvdbId) : null;
      const resolved = resolveTitles(identity, media, {
        maxTitles: env.MAX_TITLES,
        enableScriptConvert: true,
      });
      return { titles: resolved.titles, media };
    };
    return current;
  }

  envFingerprint = fp;
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
      // refresh aliases each search
      const latestRepo = await loadAliasRepository(aliasDir);
      const identity = buildIdentityFromTorznab(req);
      const media =
        identity.tvdbId != null
          ? latestRepo.findByTvdbId(identity.tvdbId)
          : null;
      return resolveTitles(identity, media, {
        maxTitles: env.MAX_TITLES,
        enableScriptConvert: true,
      });
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
