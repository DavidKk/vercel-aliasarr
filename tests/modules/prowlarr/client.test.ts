import { afterEach, describe, expect, it, vi } from "vitest";
import { createProwlarrClient } from "../../../src/modules/prowlarr/client";

describe("createProwlarrClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty array on upstream failure instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    const client = createProwlarrClient({
      baseUrl: "https://prowlarr.example.com",
      apiKey: "key",
      timeoutMs: 100,
    });
    await expect(client.search("庆余年 S02E12")).resolves.toEqual([]);
  });
});
