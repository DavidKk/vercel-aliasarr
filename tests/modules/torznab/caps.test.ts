import { describe, expect, it } from "vitest";
import { buildCapsXml } from "../../../src/modules/torznab/caps";

describe("buildCapsXml", () => {
  it("declares tvsearch with season ep tvdbid", () => {
    const xml = buildCapsXml();
    expect(xml).toContain("tv-search");
    expect(xml).toContain("season");
    expect(xml).toContain("ep");
    expect(xml).toContain("tvdbid");
    expect(xml).toContain("tmdbid");
  });
});
