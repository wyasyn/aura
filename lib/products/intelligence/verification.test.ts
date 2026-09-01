import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import {
  changedFields,
  markProvenance,
  originLabel,
  readProvenance,
} from "@/lib/products/intelligence/provenance"

const verification = readFileSync(
  "lib/products/intelligence/verification-actions.ts",
  "utf8",
)
const bulk = readFileSync("lib/products/intelligence/bulk-actions.ts", "utf8")
const extractService = readFileSync(
  "lib/products/intelligence/extract-product.ts",
  "utf8",
)
const adminActions = readFileSync("lib/products/actions.ts", "utf8")
const safety = readFileSync("lib/recommendation/safety.ts", "utf8")
const scope = readFileSync("lib/products/catalogue-scope.ts", "utf8")

/**
 * The source of one exported function.
 *
 * Taken up to the next top-level export rather than to the first closing brace:
 * a signature with an inline object type ends in a brace of its own, and a
 * lazier pattern stops there and reads as if the body were empty.
 */
function bodyOf(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`)
  if (start < 0) return ""
  const rest = source.slice(start + 1)
  const end = rest.indexOf("\nexport ")
  return end < 0 ? rest : rest.slice(0, end)
}

describe("verification is only ever an explicit act", () => {
  it("no extraction path sets confirmed", () => {
    // An automated pass saying a product is organic is a derivation; a person
    // saying so is a warranty. Nothing automatic may make that claim.
    assert.doesNotMatch(extractService, /verificationStatus: "confirmed"/)
    assert.doesNotMatch(adminActions, /verificationStatus: "confirmed"/)
  })

  it("only the verification action sets it, behind requireAdmin", () => {
    assert.match(verification, /verificationStatus: "confirmed"/)
    const fns = [...verification.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    assert.ok(fns.length >= 2, `expected the verification actions, saw ${fns.length}`)
    for (const fn of fns) {
      const body = bodyOf(verification, fn)
      assert.ok(body, `expected the body of ${fn}`)
      assert.match(body, /requireAdmin\(\)/, `${fn} must require an administrator`)
    }
  })

  it("nothing that has not been extracted can be verified", () => {
    // Confirming an extraction that never ran would be confirming nothing.
    assert.match(verification, /intelligenceStatus === "pending"/)
    assert.match(verification, /intelligenceStatus === "failed"/)
    assert.match(verification, /intelligenceStale/)
  })

  it("verification can be withdrawn, and drops to imported rather than unverified", () => {
    // The extraction still happened. Dropping to unverified would erase the
    // record that anything ran.
    assert.match(verification, /verificationStatus: "imported"/)
  })

  it("verification does not touch source data", () => {
    // Source fields belong to the store. Confirming derived intelligence says
    // nothing about them.
    for (const sourceField of ["name:", "description:", "priceCents:", "imageUrl:", "sku:"]) {
      assert.doesNotMatch(
        verification,
        new RegExp(`data: \\{[^}]*${sourceField}`),
        `${sourceField} must not be written by verification`,
      )
    }
  })
})

describe("verification is audited", () => {
  it("both verifying and revoking are recorded", () => {
    assert.match(verification, /action: "product\.intelligence_verified"/)
    assert.match(verification, /action: "product\.intelligence_verification_revoked"/)
  })

  it("a correction records which fields changed", () => {
    assert.match(adminActions, /action: "product\.intelligence_corrected"/)
    assert.match(adminActions, /fields: corrected/)
  })

  it("the actor and tenant are recorded, not just the event", () => {
    assert.match(verification, /actorId: session\.user\.id/)
    assert.match(verification, /organizationId: product\.organizationId/)
  })
})

describe("provenance records what actually happened", () => {
  it("an unrecorded field claims no origin", () => {
    // Better to admit the gap than to assert an origin nobody established.
    assert.equal(originLabel(undefined), null)
    assert.deepEqual(readProvenance(null), {})
    assert.deepEqual(readProvenance("nonsense"), {})
  })

  it("a partial map survives being read back", () => {
    // The case the first implementation got wrong. A record schema over an enum
    // key demands every key, so it rejected every map the application actually
    // writes — provenance is set a few fields at a time, and a complete map
    // would be the anomaly. The earlier tests only exercised the pure builder,
    // so nothing caught it until the label failed to appear in the browser.
    assert.deepEqual(readProvenance({ suitableSkinTypes: "admin" }), {
      suitableSkinTypes: "admin",
    })
    assert.deepEqual(readProvenance({ targetConcerns: "source", brand: "extraction" }), {
      targetConcerns: "source",
      brand: "extraction",
    })
  })

  it("unknown fields and origins are dropped without losing the rest", () => {
    assert.deepEqual(
      readProvenance({
        suitableSkinTypes: "admin",
        somethingRenamed: "admin",
        targetConcerns: "telepathy",
      }),
      { suitableSkinTypes: "admin" },
    )
  })

  it("marking one origin keeps what is recorded for other fields", () => {
    const before = markProvenance({}, ["targetConcerns"], "source")
    const after = markProvenance(before, ["suitableSkinTypes"], "extraction")

    assert.equal(after.targetConcerns, "source")
    assert.equal(after.suitableSkinTypes, "extraction")
  })

  it("an administrator's correction overrides an earlier origin for that field", () => {
    const extracted = markProvenance({}, ["suitableSkinTypes"], "extraction")
    const corrected = markProvenance(extracted, ["suitableSkinTypes"], "admin")

    assert.equal(corrected.suitableSkinTypes, "admin")
  })

  it("only fields that actually changed are attributed to the administrator", () => {
    // Marking every field on save would claim they reviewed the whole product
    // when they corrected one line.
    const before = {
      suitableSkinTypes: ["dry"],
      targetConcerns: ["dryness"],
      primaryClassification: "natural",
    }
    const after = {
      suitableSkinTypes: ["dry", "sensitive"],
      targetConcerns: ["dryness"],
      primaryClassification: "natural",
    }

    assert.deepEqual(changedFields(before, after), ["suitableSkinTypes"])
  })

  it("reordering a list is not a correction", () => {
    const before = { targetConcerns: ["dryness", "aging"] }
    const after = { targetConcerns: ["aging", "dryness"] }

    assert.deepEqual(changedFields(before, after), [])
  })

  it("clearing a field is a correction", () => {
    assert.deepEqual(
      changedFields({ primaryClassification: "natural" }, { primaryClassification: null }),
      ["primaryClassification"],
    )
  })
})

describe("bulk extraction is quota safe", () => {
  it("quota exhaustion is its own outcome, never a failure", () => {
    // Marking a product failed for an account-level limit blames the row for a
    // condition it did not cause.
    assert.match(bulk, /kind: "quota_exhausted"/)
    assert.match(bulk, /DailyQuotaExhausted/)
  })

  it("the service restores the previous status when quota stops it", () => {
    assert.match(extractService, /intelligenceStatus: previousStatus/)
  })

  it("the work list is chosen on the server, not trusted from the browser", () => {
    // A stale page must not be able to queue a product that has since been
    // extracted.
    assert.match(bulk, /intelligenceStatus: "pending"/)
    assert.match(bulk, /intelligenceStale: true/)
  })

  it("every bulk action requires an administrator", () => {
    const fns = [...bulk.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    for (const fn of fns) {
      const body = bodyOf(bulk, fn)
      assert.ok(body)
      assert.match(body, /requireAdmin\(\)/, `${fn} must require an administrator`)
    }
  })
})

describe("the engine's eligibility rule is unchanged", () => {
  // Recorded as a test so that introducing a verification requirement becomes a
  // deliberate, visible edit rather than a side effect.
  it("the engine filters on active, recommendable and availability", () => {
    assert.match(safety, /!product\.isActive/)
    assert.match(safety, /!product\.isRecommendable/)
    assert.match(safety, /RECOMMENDABLE_AVAILABILITY\.has\(product\.availability\)/)
  })

  it("the engine does not require verification", () => {
    assert.doesNotMatch(safety, /verificationStatus/)
    assert.doesNotMatch(scope, /verificationStatus/)
  })

  it("the candidate query still filters on the same two flags", () => {
    assert.match(scope, /isActive: true/)
    assert.match(scope, /isRecommendable: true/)
  })
})

describe("attribution covers every field the form can change", () => {
  // Found in the browser: concerns showed "Administrator" after an edit that
  // only touched skin types. The comparison was built from
  // productIntelligenceFields alone, which does not carry concerns, skin types
  // or climate tags — so they read as undefined against a populated previous
  // value and looked changed on every save.
  it("the correction comparison includes the base-schema intelligence fields", () => {
    const update = bodyOf(adminActions, "updateProductAction")
    for (const field of ["targetConcerns", "suitableSkinTypes", "climateTags"]) {
      assert.match(
        update,
        new RegExp(`${field}: data\.${field}`),
        `${field} must be part of the change comparison`,
      )
    }
  })

  it("an unchanged product attributes nothing to the administrator", () => {
    const values = {
      primaryClassification: "natural",
      suitableSkinTypes: ["dry"],
      targetConcerns: ["dryness"],
      climateTags: ["dry"],
      ingredientList: ["Glycerin"],
    }

    assert.deepEqual(changedFields(values, { ...values }), [])
  })
})
