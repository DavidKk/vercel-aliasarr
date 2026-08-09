import { getEnv } from "@/shared/env";
import { createProwlarrClient } from "@/modules/prowlarr/client";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(): Promise<Response> {
  let prowlarrStatus: "reachable" | "unreachable" | "unconfigured" =
    "unconfigured";
  try {
    const env = getEnv();
    const client = createProwlarrClient({
      baseUrl: env.PROWLARR_URL,
      apiKey: env.PROWLARR_API_KEY,
      timeoutMs: Math.min(env.PROWLARR_TIMEOUT_MS, 3000),
    });
    prowlarrStatus = (await client.ping()) ? "reachable" : "unreachable";
  } catch {
    prowlarrStatus = "unconfigured";
  }

  const body = {
    status: "ok",
    prowlarr: prowlarrStatus,
    database: "skipped",
    version: "0.1.0",
    runtime: "vercel",
  };

  return Response.json(body);
}
