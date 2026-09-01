/**
 * Retry and pacing for the enrichment pass.
 *
 * The Gemini free tier allows five requests a minute and twenty a day. A
 * twenty-four product catalogue walks straight into both, so the pass has to
 * pace itself and respect the delay the server asks for rather than guessing
 * one. Kept separate from the extractor so the backoff rules can be tested
 * without a network call.
 */

/** A 429 carries the delay to wait, in seconds, inside its own error payload. */
export function parseRetryDelaySeconds(message: string): number | null {
  // Two forms appear in practice: the structured `retryDelay` field, and the
  // human sentence in `message`. Prefer the structured one; fall back to the
  // sentence so a payload shape change degrades to a longer wait, not none.
  const structured = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/)
  if (structured) return Number.parseFloat(structured[1])

  const sentence = message.match(/retry in (\d+(?:\.\d+)?)s/i)
  if (sentence) return Number.parseFloat(sentence[1])

  return null
}

export function isRateLimited(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("429") || message.includes("RESOURCE_EXHAUSTED")
}

/**
 * Whether a rate limit is the per-day cap rather than the per-minute one.
 *
 * Worth distinguishing because they call for opposite responses: a per-minute
 * limit clears in under a minute and is worth waiting out, while a daily cap
 * will not clear during this run and every further request is wasted. Retrying
 * into a daily cap turns one failure into twenty-four.
 */
export function isDailyQuota(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("PerDay")
}

export class DailyQuotaExhausted extends Error {
  constructor() {
    super("Gemini daily quota exhausted — stopping so the rest can be resumed")
    this.name = "DailyQuotaExhausted"
  }
}

export const MAX_RETRY_WAIT_SECONDS = 90

export type WithRetryOptions = {
  attempts?: number
  /** Injected in tests so they do not actually sleep. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Runs `task`, waiting out per-minute rate limits.
 *
 * Throws {@link DailyQuotaExhausted} immediately on a daily cap so the caller
 * can stop the whole pass and report what is left, rather than grinding through
 * the remaining products collecting identical failures.
 */
export async function withRateLimitRetry<T>(
  task: () => Promise<T>,
  options: WithRetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3
  const sleep = options.sleep ?? defaultSleep

  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task()
    } catch (err) {
      lastError = err

      if (!isRateLimited(err)) throw err
      if (isDailyQuota(err)) throw new DailyQuotaExhausted()
      if (attempt === attempts) break

      const message = err instanceof Error ? err.message : String(err)
      const asked = parseRetryDelaySeconds(message)
      // The server's own number when it gives one, otherwise a widening wait.
      // Capped, because an unbounded delay parsed from a payload is a way for
      // a bad response to hang the pass indefinitely.
      const seconds = Math.min(asked ?? 2 ** attempt, MAX_RETRY_WAIT_SECONDS)
      await sleep(Math.ceil(seconds * 1000))
    }
  }

  throw lastError
}
