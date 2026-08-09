import {
  getDefaultTorznabDeps,
  handleTorznabRequest,
} from "@/modules/torznab/handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  const deps = await getDefaultTorznabDeps();
  return handleTorznabRequest(new URL(request.url), deps);
}
