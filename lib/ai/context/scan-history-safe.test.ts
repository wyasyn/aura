import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { rememberScanHistoryContext } from "@/lib/ai/context/memory-snapshot"
import { resolveScanHistoryFallback } from "@/lib/ai/context/scan-history-fallback"

describe("resolveScanHistoryFallback", () => {
  it("returns an empty array when no snapshot exists", () => {
    assert.deepEqual(resolveScanHistoryFallback("missing-user", "", 3), [])
  })

  it("returns remembered history when snapshot exists", () => {
    const history = [
      {
        scanId: "scan-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        overallBand: "balanced",
        summary: "Test",
        dimensions: [],
        naturalRecommendations: [],
        recommendations: [],
      },
    ]

    rememberScanHistoryContext("user-1", "", 3, history)
    assert.deepEqual(resolveScanHistoryFallback("user-1", "", 3), history)
  })
})
