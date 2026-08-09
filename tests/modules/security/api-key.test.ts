import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("assertTorznabApiKey", () => {
  beforeEach(() => {
    vi.stubEnv("TORZNAB_API_KEY", "0123456789abcdef");
    vi.stubEnv("PROWLARR_URL", "https://prowlarr.example.com");
    vi.stubEnv("PROWLARR_API_KEY", "prowlarr-key");
  });
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("accepts matching key", async () => {
    const { resetEnvCache } = await import("../../../src/shared/env");
    resetEnvCache();
    const { assertTorznabApiKey } = await import(
      "../../../src/modules/security/api-key"
    );
    expect(() => assertTorznabApiKey("0123456789abcdef")).not.toThrow();
  });

  it("rejects wrong key", async () => {
    const { resetEnvCache } = await import("../../../src/shared/env");
    resetEnvCache();
    const { assertTorznabApiKey, UnauthorizedError } = await import(
      "../../../src/modules/security/api-key"
    );
    expect(() => assertTorznabApiKey("wrong-key-wrong!!")).toThrow(
      UnauthorizedError
    );
  });
});
