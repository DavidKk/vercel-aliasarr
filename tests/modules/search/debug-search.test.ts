import { describe, expect, it, vi } from "vitest";
import { runDebugSearch } from "../../../src/modules/search/debug-search";

describe("runDebugSearch", () => {
  it("returns titles queries and deduped counts", async () => {
    const runtime = {
      env: {
        SEARCH_RESULT_LIMIT: 100,
        MAX_QUERY_FORMATS_PER_TITLE: 2,
        MAX_PROWLARR_QUERIES: 6,
      },
      resolveForRequest: async () => ({
        titles: ["庆余年", "Joy of Life"],
        media: {
          mediaId: "tvdb:366625",
          primaryTitle: "Joy of Life",
          originalLanguage: "zh",
          aliases: [
            {
              title: "庆余年",
              type: "original" as const,
              priority: 100,
              verified: true,
            },
          ],
          updatedAt: new Date().toISOString(),
        },
      }),
      prowlarr: {
        search: vi.fn(async (q: string) => [
          {
            guid: q,
            title: q,
            originalTitle: q,
            downloadUrl: `https://x/${q}`,
            categories: [5000],
            infoHash: "SAME",
          },
        ]),
      },
    };

    const out = await runDebugSearch(runtime as never, {
      tvdbId: 366625,
      season: 2,
      episode: 12,
    });

    expect(out.titles).toEqual(["庆余年", "Joy of Life"]);
    expect(out.queries.length).toBeGreaterThan(0);
    expect(out.resultCount).toBeGreaterThan(1);
    expect(out.deduplicatedCount).toBe(1);
    expect(out.media.aliases).toContain("庆余年");
  });
});
