import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { withDbWarmupRetry } from "@/lib/db/retry"

describe("withDbWarmupRetry", () => {
  it("retries transient errors before succeeding", async () => {
    let attempts = 0

    const result = await withDbWarmupRetry(async () => {
      attempts += 1
      if (attempts < 3) {
        const error = new Error("timeout") as Error & { code: string }
        error.code = "ETIMEDOUT"
        throw error
      }
      return "ok"
    })

    assert.equal(result, "ok")
    assert.equal(attempts, 3)
  })

  it("throws non-transient errors immediately", async () => {
    let attempts = 0

    await assert.rejects(
      () =>
        withDbWarmupRetry(async () => {
          attempts += 1
          throw new Error("validation failed")
        }),
      /validation failed/,
    )

    assert.equal(attempts, 1)
  })
})
