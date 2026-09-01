import assert from "node:assert/strict"
import { test } from "node:test"

import {
  DailyQuotaExhausted,
  isDailyQuota,
  isRateLimited,
  MAX_RETRY_WAIT_SECONDS,
  parseRetryDelaySeconds,
  withRateLimitRetry,
} from "@/lib/products/enrich/rate-limit"

const PER_MINUTE = `{"error":{"code":429,"message":"You exceeded your current quota. Please retry in 25.3s","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"25s"}]}}`

const PER_DAY = `{"error":{"code":429,"message":"You exceeded your current quota. Please retry in 40s","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"40s"}]}}`

function noSleep() {
  const waits: number[] = []
  return {
    waits,
    sleep: async (ms: number) => {
      waits.push(ms)
    },
  }
}

test("the structured retryDelay is preferred over the prose sentence", () => {
  assert.equal(parseRetryDelaySeconds(PER_MINUTE), 25)
})

test("the prose sentence is used when no structured delay is present", () => {
  assert.equal(parseRetryDelaySeconds("Please retry in 12.5s please"), 12.5)
})

test("a payload with no delay at all yields null rather than zero", () => {
  // Zero would mean "retry immediately", which is the opposite of what an
  // unparseable rate-limit response should cause.
  assert.equal(parseRetryDelaySeconds("something went wrong"), null)
})

test("rate limits are recognised by code or status", () => {
  assert.equal(isRateLimited(new Error(PER_MINUTE)), true)
  assert.equal(isRateLimited(new Error("RESOURCE_EXHAUSTED")), true)
  assert.equal(isRateLimited(new Error("400 bad request")), false)
})

test("a daily cap is distinguished from a per-minute one", () => {
  assert.equal(isDailyQuota(new Error(PER_DAY)), true)
  assert.equal(isDailyQuota(new Error(PER_MINUTE)), false)
})

test("a per-minute limit is waited out for the duration the server asked for", async () => {
  const { waits, sleep } = noSleep()
  let calls = 0

  const result = await withRateLimitRetry(
    async () => {
      calls += 1
      if (calls === 1) throw new Error(PER_MINUTE)
      return "ok"
    },
    { sleep },
  )

  assert.equal(result, "ok")
  assert.equal(calls, 2)
  assert.deepEqual(waits, [25000])
})

test("a daily cap stops the pass instead of retrying into it", async () => {
  const { waits, sleep } = noSleep()
  let calls = 0

  await assert.rejects(
    withRateLimitRetry(
      async () => {
        calls += 1
        throw new Error(PER_DAY)
      },
      { sleep },
    ),
    DailyQuotaExhausted,
  )

  // One attempt, no waiting. Retrying into a daily cap turns one failure into
  // one per remaining product.
  assert.equal(calls, 1)
  assert.deepEqual(waits, [])
})

test("a non-rate-limit error is raised immediately", async () => {
  let calls = 0

  await assert.rejects(
    withRateLimitRetry(async () => {
      calls += 1
      throw new Error("GEMINI_API_KEY is not configured")
    }),
    /GEMINI_API_KEY/,
  )

  assert.equal(calls, 1)
})

test("the wait is capped so a bad payload cannot hang the pass", async () => {
  const { waits, sleep } = noSleep()

  await assert.rejects(
    withRateLimitRetry(
      async () => {
        throw new Error(`429 RESOURCE_EXHAUSTED "retryDelay": "99999s"`)
      },
      { attempts: 2, sleep },
    ),
  )

  assert.deepEqual(waits, [MAX_RETRY_WAIT_SECONDS * 1000])
})
