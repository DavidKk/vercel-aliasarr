import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/shared/env";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function assertTorznabApiKey(apikey: string | null | undefined): void {
  const expected = getEnv().TORZNAB_API_KEY;
  if (!apikey || !timingSafeEqualString(apikey, expected)) {
    throw new UnauthorizedError();
  }
}
