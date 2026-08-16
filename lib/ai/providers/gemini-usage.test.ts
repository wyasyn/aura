import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { mapGeminiUsageMetadata } from "./gemini-usage"

describe("mapGeminiUsageMetadata", () => {
  it("maps standard prompt and candidate tokens", () => {
    const result = mapGeminiUsageMetadata("gemini", "gemini-2.5-flash", {
      promptTokenCount: 5000,
      candidatesTokenCount: 1200,
      totalTokenCount: 6200,
    })

    assert.equal(result.inputTokens, 5000)
    assert.equal(result.outputTokens, 1200)
    assert.equal(result.cachedTokens, 0)
    assert.equal(result.reasoningTokens, 0)
    assert.equal(result.totalTokens, 6200)
  })

  it("includes thinking tokens in output and reasoning fields", () => {
    const result = mapGeminiUsageMetadata("gemini", "gemini-3.5-flash", {
      promptTokenCount: 4000,
      candidatesTokenCount: 800,
      thoughtsTokenCount: 300,
      totalTokenCount: 5100,
    })

    assert.equal(result.outputTokens, 1100)
    assert.equal(result.reasoningTokens, 300)
    assert.equal(result.totalTokens, 5100)
  })

  it("normalizes cached tokens out of billable input", () => {
    const result = mapGeminiUsageMetadata("gemini", "gemini-2.5-flash", {
      promptTokenCount: 6000,
      cachedContentTokenCount: 1500,
      candidatesTokenCount: 900,
    })

    assert.equal(result.inputTokens, 4500)
    assert.equal(result.cachedTokens, 1500)
    assert.equal(result.outputTokens, 900)
    assert.equal(result.totalTokens, 6900)
  })

  it("falls back to responseTokenCount when candidates are missing", () => {
    const result = mapGeminiUsageMetadata("gemini", "gemini-2.5-flash", {
      promptTokenCount: 1000,
      responseTokenCount: 250,
    })

    assert.equal(result.outputTokens, 250)
  })

  it("returns zeros when metadata is missing", () => {
    const result = mapGeminiUsageMetadata("gemini", "gemini-2.5-flash", null)

    assert.equal(result.inputTokens, 0)
    assert.equal(result.outputTokens, 0)
    assert.equal(result.cachedTokens, 0)
    assert.equal(result.totalTokens, 0)
    assert.equal(result.rawUsage, null)
  })
})
