import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  recallScanHistoryContext,
  recallUserScanContext,
  rememberScanHistoryContext,
  rememberUserScanContext,
} from "@/lib/ai/context/memory-snapshot"

describe("memory-snapshot", () => {
  it("recalls user scan context by user id", () => {
    rememberUserScanContext("user-1", {
      profile: null,
      location: {
        city: "Kampala",
        region: "Central",
        country: "UG",
        uvIndexBand: null,
        humidityBand: null,
        temperatureBand: null,
        climateZone: null,
        seasonBand: null,
      },
    })

    const recalled = recallUserScanContext("user-1")
    assert.ok(recalled)
    assert.equal(recalled?.location?.city, "Kampala")
  })

  it("recalls scan history by user, exclude id, and limit", () => {
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
    assert.deepEqual(recallScanHistoryContext("user-1", "", 3), history)
  })
})
