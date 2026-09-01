import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { checkEligibility } from "@/lib/training/eligibility"

const base = {
  patientConsented: true,
  clinicAllowsContribution: null,
  hasAssessment: true,
  scanStatus: "completed",
}

describe("checkEligibility", () => {
  it("admits a consenting platform patient's completed scan", () => {
    assert.deepEqual(checkEligibility(base), { eligible: true })
  })

  it("admits a clinic scan when both clinic and patient agree", () => {
    assert.deepEqual(
      checkEligibility({ ...base, clinicAllowsContribution: true }),
      { eligible: true },
    )
  })

  it("refuses without patient consent", () => {
    const result = checkEligibility({ ...base, patientConsented: false })
    assert.equal(result.eligible, false)
    if (result.eligible) return
    assert.equal(result.reason, "no_patient_consent")
  })

  it("refuses a clinic scan the clinic has not opted into", () => {
    const result = checkEligibility({ ...base, clinicAllowsContribution: false })
    assert.equal(result.eligible, false)
    if (result.eligible) return
    assert.equal(result.reason, "clinic_has_not_opted_in")
  })

  // The important one: a clinic enabling contribution must never stand in for
  // the patient's own decision.
  it("refuses when the clinic agreed but the patient did not", () => {
    const result = checkEligibility({
      ...base,
      patientConsented: false,
      clinicAllowsContribution: true,
    })
    assert.equal(result.eligible, false)
    if (result.eligible) return
    assert.equal(
      result.reason,
      "no_patient_consent",
      "patient consent must be reported as the blocker, not the clinic",
    )
  })

  it("refuses when neither consented", () => {
    const result = checkEligibility({
      ...base,
      patientConsented: false,
      clinicAllowsContribution: false,
    })
    assert.equal(result.eligible, false)
  })

  it("refuses an incomplete scan", () => {
    const result = checkEligibility({ ...base, scanStatus: "failed" })
    assert.equal(result.eligible, false)
    if (result.eligible) return
    assert.equal(result.reason, "scan_incomplete")
  })

  it("refuses a scan with no assessment", () => {
    const result = checkEligibility({ ...base, hasAssessment: false })
    assert.equal(result.eligible, false)
    if (result.eligible) return
    assert.equal(result.reason, "no_assessment")
  })

  // Exhaustive over the two consent flags, since this is the rule that decides
  // whether health data enters a training set.
  it("admits exactly one of the four consent combinations", () => {
    const combinations = [
      { patient: true, clinic: true, expected: true },
      { patient: true, clinic: false, expected: false },
      { patient: false, clinic: true, expected: false },
      { patient: false, clinic: false, expected: false },
    ]

    for (const combo of combinations) {
      const result = checkEligibility({
        ...base,
        patientConsented: combo.patient,
        clinicAllowsContribution: combo.clinic,
      })
      assert.equal(
        result.eligible,
        combo.expected,
        `patient=${combo.patient} clinic=${combo.clinic}`,
      )
    }
  })
})
