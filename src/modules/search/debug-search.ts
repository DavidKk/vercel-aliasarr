import { getAppRuntime } from "@/modules/app/runtime";
import { deduplicateResults } from "@/modules/search/deduplicator";
import { generateQueries } from "@/modules/search/query-generator";
import type { SearchResult } from "@/modules/search/types";

export interface DebugSearchInput {
  tvdbId: number;
  season?: number;
  episode?: number;
  q?: string;
}

export interface DebugSearchOutput {
  media: {
    primaryTitle: string | null;
    aliases: string[];
    originalLanguage?: string;
  };
  titles: string[];
  queries: string[];
  resultCount: number;
  deduplicatedCount: number;
  results: Array<
    Pick<SearchResult, "title" | "indexerName" | "size" | "seeders" | "guid">
  >;
}

export async function runDebugSearch(
  runtime: AppRuntimeLike,
  input: DebugSearchInput
): Promise<DebugSearchOutput> {
  const req = {
    type: "tvsearch" as const,
    q: input.q,
    season: input.season,
    ep: input.episode,
    tvdbId: input.tvdbId,
    categories: [5000],
    limit: runtime.env.SEARCH_RESULT_LIMIT,
    offset: 0,
  };

  const { titles, media } = await runtime.resolveForRequest(req);
  const queries = generateQueries({
    titles,
    season: input.season,
    episode: input.episode,
    maxFormatsPerTitle: runtime.env.MAX_QUERY_FORMATS_PER_TITLE,
    maxQueries: runtime.env.MAX_PROWLARR_QUERIES,
  });

  const batches = await Promise.all(
    queries.map((query) => runtime.prowlarr.search(query))
  );
  const raw = batches.flat();
  const deduped = deduplicateResults(raw).slice(
    0,
    runtime.env.SEARCH_RESULT_LIMIT
  );

  return {
    media: {
      primaryTitle: media?.primaryTitle ?? input.q ?? null,
      aliases: media?.aliases.map((a) => a.title) ?? [],
      originalLanguage: media?.originalLanguage,
    },
    titles,
    queries,
    resultCount: raw.length,
    deduplicatedCount: deduped.length,
    results: deduped.slice(0, 20).map((r) => ({
      title: r.title,
      indexerName: r.indexerName,
      size: r.size,
      seeders: r.seeders,
      guid: r.guid,
    })),
  };
}

type AppRuntimeLike = Awaited<ReturnType<typeof getAppRuntime>>;
