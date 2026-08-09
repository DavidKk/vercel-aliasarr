import { describe, expect, it } from "vitest";
import {
  buildErrorXml,
  buildRssXml,
} from "../../../src/modules/torznab/xml-builder";

describe("xml-builder", () => {
  it("escapes special characters in titles", () => {
    const xml = buildRssXml([
      {
        title: `庆余年 & <test> "quote"`,
        guid: "abc",
        link: "https://example.com/dl",
        pubDate: new Date("2024-01-01T00:00:00Z"),
        size: 1000,
        categories: [5000],
        seeders: 10,
        peers: 12,
      },
    ]);
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;test&gt;");
    expect(xml).not.toContain("<test>");
  });

  it("builds torznab error xml", () => {
    const xml = buildErrorXml(100, "Unauthorized");
    expect(xml).toContain('error code="100"');
    expect(xml).toContain("Unauthorized");
  });
});
