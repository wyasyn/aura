/**
 * Who may contribute a scan to the training set.
 *
 * Two rules, both of which must hold:
 *
 *   - The patient has explicitly consented to training. Consenting to have a
 *     scan analysed is a different decision, and is not enough.
 *   - If the scan belongs to a clinic, that clinic has also enabled
 *     contribution. Those patients signed up with the clinic, so the clinic
 *     agreeing is necessary — but never sufficient on its own, which is why
 *     patient consent is checked regardless of who owns the scan.
 *
 * Written as a pure function so the rule can be tested exhaustively and reused
 * by both collection and any later re-check.
 */

export type EligibilityInput = {
  patientConsented: boolean
  /** Null when the scan belongs to the platform rather than a clinic. */
  clinicAllowsContribution: boolean | null
  hasAssessment: boolean
  scanStatus: string
}

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: EligibilityReason }

export type EligibilityReason =
  | "no_patient_consent"
  | "clinic_has_not_opted_in"
  | "no_assessment"
  | "scan_incomplete"

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  // Checked first and unconditionally. A clinic cannot consent on a patient's
  // behalf, so this must not sit behind the clinic branch.
  if (!input.patientConsented) {
    return { eligible: false, reason: "no_patient_consent" }
  }

  if (input.clinicAllowsContribution === false) {
    return { eligible: false, reason: "clinic_has_not_opted_in" }
  }

  if (input.scanStatus !== "completed") {
    return { eligible: false, reason: "scan_incomplete" }
  }

  if (!input.hasAssessment) {
    return { eligible: false, reason: "no_assessment" }
  }

  return { eligible: true }
}

export function describeEligibilityReason(reason: EligibilityReason): string {
  switch (reason) {
    case "no_patient_consent":
      return "The patient has not consented to their scans being used for training."
    case "clinic_has_not_opted_in":
      return "This scan belongs to a clinic that has not enabled contribution."
    case "no_assessment":
      return "The scan has no assessment to learn from."
    case "scan_incomplete":
      return "The scan did not complete."
  }
}
