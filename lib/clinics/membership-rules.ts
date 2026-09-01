import type { MembershipStatus } from "@/generated/prisma/client"

/**
 * The rules governing a membership's lifecycle, in one place.
 *
 * Two callers enforce them: clinic managers acting inside their own tenant, and
 * platform administrators acting on a tenant they are not members of. Those two
 * differ in *authorization* and in how the tenant is identified — they must not
 * differ in what a legal transition is. Keeping the rules here is what stops the
 * admin path quietly permitting something the clinic path forbids.
 *
 * Pure: no database, no session. The caller has already loaded the membership
 * and proven it belongs to the tenant being acted on.
 */

export type MembershipSubject = {
  role: string
  status: MembershipStatus
}

export class MembershipRuleError extends Error {}

/** States that still consume a seat against the plan. */
export const SEAT_CONSUMING_STATUSES: MembershipStatus[] = ["active", "invited"]

/** States a person may be moved between. Revocation is one-way and separate. */
export type ReversibleStatus = Extract<MembershipStatus, "active" | "suspended">

/**
 * The owner is the billing contact and the last guaranteed route to control of
 * a clinic. Removing or demoting them would leave the tenant with nobody
 * certain to be able to manage it — including nobody able to undo the change.
 */
function assertNotOwner(member: MembershipSubject, verb: string): void {
  if (member.role === "owner") {
    throw new MembershipRuleError(`The clinic owner cannot be ${verb}.`)
  }
}

export function assertCanChangeRole(member: MembershipSubject): void {
  assertNotOwner(member, "changed")
}

export function assertCanRevoke(member: MembershipSubject): void {
  assertNotOwner(member, "removed")
}

/**
 * Suspension is reversible; revocation is not.
 *
 * A revoked membership is not restored by flipping the enum back. The
 * relationship ended, and re-establishing it goes through a fresh invitation so
 * that the person's return is itself a recorded, deliberate act rather than an
 * edit to a status field.
 */
export function assertCanSetStatus(
  member: MembershipSubject,
  next: ReversibleStatus,
): void {
  assertNotOwner(member, next === "suspended" ? "suspended" : "reinstated")

  if (member.status === "revoked") {
    throw new MembershipRuleError(
      "A revoked membership cannot be reinstated. Invite them again.",
    )
  }
}

/** The audit action for a status transition. */
export function statusAuditAction(
  next: ReversibleStatus,
): "membership.suspended" | "membership.reactivated" {
  return next === "suspended" ? "membership.suspended" : "membership.reactivated"
}
