/**
 * Best-effort, in-memory rate limiting.
 *
 * Deliberately databaseless: this counts only within a single warm serverless
 * instance, so it is a speed bump for casual abuse, not a guarantee. It pairs
 * with the honeypot and the submit-timing check in the route. If the waitlist
 * ever gets seriously targeted, put Vercel's WAF or a KV store in front of it.
 */

type Bucket = { count: number; resetAt: number }

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_IP = 5
const MAX_KEYS = 5000

const buckets = new Map<string, Bucket>()

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // hard ceiling so a spray of unique IPs can't grow the map without bound
  if (buckets.size > MAX_KEYS) {
    const excess = buckets.size - MAX_KEYS
    let i = 0
    for (const key of buckets.keys()) {
      if (i++ >= excess) break
      buckets.delete(key)
    }
  }
}

export function allow(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, retryAfter: 0 }
  }

  bucket.count += 1
  if (bucket.count > MAX_PER_IP) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}
