import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { permissionsForTenantRole } from "@/lib/clinics/permissions"
import {
  DEFAULT_WEIGHTS,
  resolveWeights,
  scoringWeightsSchema,
} from "@/lib/recommendation/weights"
import { WEIGHT_AXIS_COPY, WEIGHT_BOUNDS } from "@/lib/recommendation/weight-copy"

const actions = readFileSync("lib/clinics/recommendation-weight-actions.ts", "utf8")

describe("a clinic reads and writes only its own weights", () => {
  // The whole of a cross-tenant write is accepting a clinic id from the caller.
  it("the tenant is resolved from the session, never taken from the payload", () => {
    assert.match(actions, /requireClinicMember\(\)/)
    assert.match(actions, /where: \{ id: session\.tenant\.clinicId \}/)
    assert.doesNotMatch(actions, /organizationId:\s*input/)
    assert.doesNotMatch(actions, /clinicId:\s*input/)
  })

  it("every exported action authorizes before it touches the database", () => {
    const fns = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    assert.ok(fns.length >= 3, `expected the weight actions, saw ${fns.length}`)

    for (const fn of fns) {
      const body = actions.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`))
      assert.ok(body, `expected the body of ${fn}`)
      assert.match(body[0], /requireClinicMember\(\)/, `${fn} must resolve a membership`)
      assert.match(
        body[0],
        /requirePermission\(session, "RECOMMENDATION_/,
        `${fn} must check a permission`,
      )
    }
  })

  it("writes require configure, not merely view", () => {
    for (const fn of ["saveClinicRecommendationWeights", "resetClinicRecommendationWeights"]) {
      const body = actions.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`))
      assert.ok(body)
      assert.match(body[0], /requirePermission\(session, "RECOMMENDATION_CONFIGURE"\)/)
    }
  })
})

describe("read and write are separate permissions", () => {
  it("owners and clinic admins may configure", () => {
    for (const role of ["owner", "admin"]) {
      const granted = permissionsForTenantRole(role)
      assert.ok(granted.includes("RECOMMENDATION_VIEW"), `${role} should view`)
      assert.ok(granted.includes("RECOMMENDATION_CONFIGURE"), `${role} should configure`)
    }
  })

  it("an ordinary member may view but not configure", () => {
    // Changing these changes the advice every patient of the clinic receives.
    const granted = permissionsForTenantRole("member")
    assert.ok(granted.includes("RECOMMENDATION_VIEW"))
    assert.ok(!granted.includes("RECOMMENDATION_CONFIGURE"))
  })

  it("someone with no role has neither", () => {
    assert.deepEqual(permissionsForTenantRole(null), [])
  })
})

describe("the backend remains authoritative", () => {
  it("a weight that would invert the ranking is refused", () => {
    // Stored weights are tenant-editable. A negative concern match ranks the
    // least relevant product first.
    assert.equal(scoringWeightsSchema.safeParse({ ...DEFAULT_WEIGHTS, concernMatch: -1 }).success, false)
    assert.equal(scoringWeightsSchema.safeParse({ ...DEFAULT_WEIGHTS, concernMatch: 1000 }).success, false)
    assert.equal(scoringWeightsSchema.safeParse({ ...DEFAULT_WEIGHTS, completenessFloor: 2 }).success, false)
  })

  it("a valid configuration is accepted", () => {
    assert.equal(scoringWeightsSchema.safeParse(DEFAULT_WEIGHTS).success, true)
  })

  it("a clinic that tuned one axis keeps the defaults for the rest", () => {
    const resolved = resolveWeights({ concernMatch: 25 })
    assert.equal(resolved.concernMatch, 25)
    assert.equal(resolved.skinTypeFit, DEFAULT_WEIGHTS.skinTypeFit)
  })

  it("a corrupt stored value falls back rather than failing the scan", () => {
    assert.deepEqual(resolveWeights("nonsense"), DEFAULT_WEIGHTS)
    assert.deepEqual(resolveWeights(null), DEFAULT_WEIGHTS)
  })

  it("reset clears the row rather than storing a copy of the defaults", () => {
    // One authoritative default. A clinic holding its own copy would keep
    // yesterday's numbers when the platform's change.
    assert.match(actions, /recommendationWeights: Prisma\.DbNull/)
  })
})

describe("the configuration screen describes the engine it configures", () => {
  it("every axis the engine scores has an explanation", () => {
    const described = new Set(WEIGHT_AXIS_COPY.map((axis) => axis.key))
    for (const key of Object.keys(DEFAULT_WEIGHTS)) {
      assert.ok(described.has(key as keyof typeof DEFAULT_WEIGHTS), `${key} needs copy`)
    }
  })

  it("no explanation names an axis the engine does not have", () => {
    for (const axis of WEIGHT_AXIS_COPY) {
      assert.ok(axis.key in DEFAULT_WEIGHTS, `${axis.key} is not a scoring axis`)
    }
  })

  it("the form's bounds match the schema's", () => {
    // Mirrored, so the control cannot produce a value the server will refuse.
    for (const [key, bounds] of Object.entries(WEIGHT_BOUNDS)) {
      const tooHigh = { ...DEFAULT_WEIGHTS, [key]: bounds.max + 1 }
      const tooLow = { ...DEFAULT_WEIGHTS, [key]: bounds.min - 1 }
      assert.equal(scoringWeightsSchema.safeParse(tooHigh).success, false, `${key} max`)
      assert.equal(scoringWeightsSchema.safeParse(tooLow).success, false, `${key} min`)
      assert.equal(
        scoringWeightsSchema.safeParse({ ...DEFAULT_WEIGHTS, [key]: bounds.max }).success,
        true,
        `${key} should accept its own maximum`,
      )
    }
  })
})

describe("changing weights is audited", () => {
  it("both sides of the change are recorded", () => {
    // "What did it used to be" is the question an audit of a configuration
    // change exists to answer.
    assert.match(actions, /previous: previous\?\.recommendationWeights/)
    assert.match(actions, /next: parsed\.data/)
  })

  it("it uses the existing tenant audit vocabulary", () => {
    assert.match(actions, /action: "tenant\.recommendation_weights_changed"/)
    assert.match(actions, /subjectType: "clinic"/)
  })

  it("the scoring version is recorded with the change", () => {
    // Without it a stored configuration cannot be matched to the arithmetic
    // that consumed it.
    assert.match(actions, /weightsVersion: WEIGHTS_VERSION/)
  })
})
