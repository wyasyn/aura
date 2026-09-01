/**
 * Fixed-window rate limiting for partner API keys.
 *
 * Deliberately in-memory: this instance-local counter is enough to stop a
 * runaway integration hammering the database, which is the realistic failure
 * here. It is NOT a security control — with more than one server instance each
 * gets its own window, so the effective limit multiplies by instance count.
 * Move the counter to Redis before relying on it to enforce a quota.
 */

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 120

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

export function checkRateLimit(apiKeyId: string): RateLimitResult {
  const now = Date.now()
  const existing = windows.get(apiKeyId)

  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + WINDOW_MS }
    windows.set(apiKeyId, fresh)
    pruneExpired(now)
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetAt: fresh.resetAt,
      limit: MAX_REQUESTS_PER_WINDOW,
    }
  }

  existing.count += 1
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - existing.count)

  return {
    allowed: existing.count <= MAX_REQUESTS_PER_WINDOW,
    remaining,
    resetAt: existing.resetAt,
    limit: MAX_REQUESTS_PER_WINDOW,
  }
}

/** Keeps the map from growing without bound as keys come and go. */
function pruneExpired(now: number) {
  if (windows.size < 1000) return
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  }
}
