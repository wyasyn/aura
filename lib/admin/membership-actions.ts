"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAudit, recordAuditIn, recordDenied } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { requireAdmin } from "@/lib/auth/session"
import {
  MembershipRuleError,
  assertCanChangeRole,
  assertCanRevoke,
  assertCanSetStatus,
  statusAuditAction,
} from "@/lib/clinics/membership-rules"
import { prisma } from "@/lib/db/client"

/**
 * Membership management from the platform control plane.
 *
 * The mirror of lib/clinics/member-actions.ts, differing only in who is allowed
 * to call it and how the tenant is named. A clinic manager acts inside a tenant
 * they belong to, and the scope comes from their membership. An administrator
 * acts on a tenant they are *not* a member of, so the tenant is named
 * explicitly and authority comes from requireAdmin.
 *
 * The rules themselves are shared, in lib/clinics/membership-rules.ts. That is
 * deliberate: if the two paths kept their own copies, the admin route would
 * eventually permit something the clinic route forbids, and the owner
 * protection would be the first thing to drift.
 *
 * The organizationId below identifies *which* membership to act on. It never
 * grants the right to act — that has already been established by requireAdmin
 * before it is read, and the membership is matched on the pair so an id from
 * one tenant cannot reach a member of another.
 */

const memberRef = z.object({
  organizationId: z.string().trim().min(1),
  memberId: z.string().trim().min(1),
})

const roleInput = memberRef.extend({
  role: z.enum(["admin", "member"]),
})

const statusInput = memberRef.extend({
  status: z.enum(["active", "suspended"]),
})

/**
 * Loads a membership within the named tenant.
 *
 * findFirst on the pair rather than findUnique on the id: a lookup by id alone
 * would read a membership belonging to some other clinic and leave the tenant
 * check to whatever the caller remembers to do next.
 */
async function loadMember(organizationId: string, memberId: string) {
  return prisma.member.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, role: true, status: true, userId: true },
  })
}

type AdminActionResult = { ok: true } | { ok: false; error: string }

async function withMember(
  input: { organizationId: string; memberId: string },
  actorId: string,
  action: "membership.role_changed" | "membership.revoked" | "membership.suspended" | "membership.reactivated",
  run: (member: NonNullable<Awaited<ReturnType<typeof loadMember>>>) => Promise<void>,
): Promise<AdminActionResult> {
  const member = await loadMember(input.organizationId, input.memberId)

  if (!member) {
    // A membership that is not in this tenant is reported the same way as one
    // that does not exist, and the attempt is recorded: an id tried against the
    // wrong clinic is worth being able to see later.
    await recordDenied({
      action,
      subjectType: "membership",
      subjectId: input.memberId,
      actorId,
      actorRole: "admin",
      organizationId: input.organizationId,
      metadata: { reason: "not_in_tenant" },
    })
    return { ok: false, error: "Member not found" }
  }

  try {
    await run(member)
  } catch (error) {
    if (error instanceof MembershipRuleError) {
      await recordDenied({
        action,
        subjectType: "membership",
        subjectId: member.id,
        actorId,
        actorRole: "admin",
        organizationId: input.organizationId,
        metadata: { reason: "rule", targetUserId: member.userId },
      })
      return { ok: false, error: error.message }
    }
    throw error
  }

  revalidatePath(`/admin/clinics/${input.organizationId}`)
  return { ok: true }
}

export async function adminSetMemberRoleAction(
  input: unknown,
): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const parsed = roleInput.parse(input)

  return withMember(parsed, session.user.id, "membership.role_changed", async (member) => {
    assertCanChangeRole(member)

    await prisma.member.update({
      where: { id: member.id },
      data: { role: parsed.role },
    })

    await recordAudit({
      action: "membership.role_changed",
      subjectType: "membership",
      subjectId: member.id,
      actorId: session.user.id,
      actorRole: "admin",
      organizationId: parsed.organizationId,
      metadata: { from: member.role, to: parsed.role, targetUserId: member.userId },
    })
  })
}

export async function adminSetMemberStatusAction(
  input: unknown,
): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const parsed = statusInput.parse(input)
  const action = statusAuditAction(parsed.status)

  return withMember(parsed, session.user.id, action, async (member) => {
    assertCanSetStatus(member, parsed.status)

    // Tier A, matching the clinic-side path: the status change and its record
    // commit together.
    const requestId = await currentRequestId()
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: { status: parsed.status },
      })

      await recordAuditIn(tx, {
        action,
        subjectType: "membership",
        subjectId: member.id,
        actorId: session.user.id,
        actorRole: "admin",
        organizationId: parsed.organizationId,
        requestId,
        metadata: { previousStatus: member.status, targetUserId: member.userId },
      })
    })
  })
}

export async function adminRevokeMemberAction(
  input: unknown,
): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const parsed = memberRef.parse(input)

  return withMember(parsed, session.user.id, "membership.revoked", async (member) => {
    assertCanRevoke(member)

    // A state change, never a delete: the row is the record that this person
    // once had access to this clinic.
    //
    // Tier A — the revocation and its record commit together.
    const requestId = await currentRequestId()
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: { status: "revoked" },
      })

      await recordAuditIn(tx, {
        action: "membership.revoked",
        subjectType: "membership",
        subjectId: member.id,
        actorId: session.user.id,
        actorRole: "admin",
        organizationId: parsed.organizationId,
        requestId,
        metadata: { previousStatus: member.status, targetUserId: member.userId },
      })
    })
  })
}
