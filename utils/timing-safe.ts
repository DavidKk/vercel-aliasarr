import { timingSafeEqual } from 'node:crypto'

/** Compare two strings in constant time. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) {
    return false
  }
  return timingSafeEqual(ba, bb)
}
