import { timingSafeStringEqual } from '@/utils/timing-safe'

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  return timingSafeStringEqual(a, b)
}

export function assertTorznabApiKey(apikey: string | null | undefined, expected: string | null | undefined): void {
  if (!apikey || !expected || !timingSafeEqualString(apikey, expected)) {
    throw new UnauthorizedError()
  }
}
