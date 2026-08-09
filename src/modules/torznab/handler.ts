import { randomUUID } from "node:crypto";
import path from "node:path";
import { getEnv } from "@/shared/env";
import { childLogger } from "@/shared/logger";
import { createMemoryCache } from "@/modules/cache/memory-cache";
import { loadAliasRepository } from "@/modules/media/alias-repository";
import { buildIdentityFromTorznab } from "@/modules/media/identity";
import { resolveTitles } from "@/modules/media/title-resolver";
import { createProwlarrClient } from "@/modules/prowlarr/client";
import { generateQueries } from "@/modules/search/query-generator";
import { createSearchService } from "@/modules/search/search-service";
import type { SearchResult } from "@/modules/search/types";
import {
  assertTorznabApiKey,
  UnauthorizedError,
} from "@/modules/security/api-key";
import { buildCapsXml } from "@/modules/torznab/caps";
import { TorznabError } from "@/modules/torznab/errors";
import { parseTorznabQuery } from "@/modules/torznab/parser";
import type { TorznabItem } from "@/modules/torznab/types";
import { buildErrorXml, buildRssXml } from "@/modules/torznab/xml-builder";

const XML_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
};

export interface TorznabDeps {
  searchService: {
    tvSearch: (req: ReturnType<typeof parseTorznabQuery>) => Promise<
      SearchResult[]
    >;
  };
}

let singleton: TorznabDeps | null = null;

export async function getDefaultTorznabDeps(): Promise<TorznabDeps> {
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
  const searchService = createSearchService({
    resolveTitlesForRequest: async (req) => {
      const identity = buildIdentityFromTorznab(req);
      const media =
        identity.tvdbId != null ? repo.findByTvdbId(identity.tvdbId) : null;
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
  singleton = { searchService };
  return singleton;
}

function toItems(results: SearchResult[]): TorznabItem[] {
  return results.map((r) => ({
    title: r.title,
    guid: r.guid,
    link: r.downloadUrl,
    pubDate: r.publishDate ? new Date(r.publishDate) : new Date(),
    size: r.size,
    categories: r.categories.length ? r.categories : [5000],
    seeders: r.seeders,
    peers: r.peers,
    infoHash: r.infoHash,
  }));
}

export async function handleTorznabRequest(
  url: URL,
  deps: TorznabDeps
): Promise<Response> {
  const requestId = randomUUID();
  const log = childLogger({ requestId });

  try {
    const req = parseTorznabQuery(url.searchParams);
    assertTorznabApiKey(req.apikey);

    if (req.type === "caps") {
      return new Response(buildCapsXml(), { status: 200, headers: XML_HEADERS });
    }

    log.info(
      {
        type: req.type,
        tvdbId: req.tvdbId,
        season: req.season,
        ep: req.ep,
      },
      "torznab search"
    );

    const results = await deps.searchService.tvSearch(req);
    const xml = buildRssXml(toItems(results), {
      offset: req.offset,
      total: results.length,
    });
    log.info({ resultCount: results.length }, "torznab search done");
    return new Response(xml, { status: 200, headers: XML_HEADERS });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response(buildErrorXml(100, "Unauthorized"), {
        status: 401,
        headers: XML_HEADERS,
      });
    }
    if (err instanceof TorznabError) {
      return new Response(buildErrorXml(err.code, err.message), {
        status: 400,
        headers: XML_HEADERS,
      });
    }
    log.error(
      { err: err instanceof Error ? err.message : String(err) },
      "torznab handler error"
    );
    return new Response(buildErrorXml(900, "Internal error"), {
      status: 500,
      headers: XML_HEADERS,
    });
  }
}
