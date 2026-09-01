"use server"

import { recordAudit, recordAuditIn, recordDenied } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import {
  assertCanChangeRole,
  assertCanRevoke,
  assertCanSetStatus,
  statusAuditAction,
} from "@/lib/clinics/membership-rules"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthContext } from "@/lib/auth/context"
import { requireClinicManager } from "@/lib/clinics/membership"
import { formatSeats, wouldExceedLimit } from "@/lib/clinics/plan-limits"
import { resolveTenant } from "@/lib/clinics/tenant"
import { prisma } from "@/lib/db/client"

const INVITE_TTL_DAYS = 14

function revalidateTeam() {
  revalidatePath("/clinic/team")
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  role: z.enum(["admin", "member"]),
})

/**
 * Invites a staff member. Seats are counted as current members plus still-open
 * invitations, so a burst of invites can't overshoot the plan and leave the
 * clinic over its seat limit once they are all accepted.
 */
export async function inviteClinicMemberAction(input: unknown) {
  const session = await requireClinicManager()
  const { email, role } = inviteSchema.parse(input)
  const organizationId = session.scope

  // Checked before the counts: no plan at all is a different situation from a
  // plan whose seats are full, and the previous code conflated the two by
  // treating a missing plan as a limit of zero.
  const plan = session.tenant.plan
  if (!plan) {
    throw new Error("This clinic has no plan assigned yet, so it has no seats.")
  }

  const [memberCount, pendingCount] = await Promise.all([
    // Only live memberships consume a seat. A revoked member keeps its row
    // so the relationship stays on record, but it must not hold a seat.
    prisma.member.count({
      where: { organizationId, status: { in: ["active", "invited"] } },
    }),
    prisma.invitation.count({ where: { organizationId, status: "pending" } }),
  ])

  if (wouldExceedLimit(plan.seatLimit, memberCount + pendingCount)) {
    throw new Error(
      `Your plan includes ${formatSeats(plan.seatLimit)}, and they are all taken or invited. Upgrade the plan to add more.`,
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existingUser) {
    const alreadyMember = await prisma.member.findUnique({
      where: { userId_organizationId: { userId: existingUser.id, organizationId } },
      select: { id: true },
    })
    if (alreadyMember) {
      throw new Error(`${email} is already on your team.`)
    }
  }

  const openInvite = await prisma.invitation.findFirst({
    where: { organizationId, email, status: "pending" },
    select: { id: true },
  })
  if (openInvite) {
    throw new Error(`${email} already has a pending invitation.`)
  }

  const invitation = await prisma.invitation.create({
    data: {
      id: randomUUID(),
      organizationId,
      email,
      role,
      status: "pending",
      inviterId: session.userId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  // An invitation is a standing grant of future access to this tenant's data.
  // The email is the subject of the grant rather than incidental detail, so it
  // is recorded; it is a business contact the clinic itself supplied, not
  // clinical information about a patient.
  await recordAudit({
    action: "membership.invited",
    subjectType: "membership",
    subjectId: invitation.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { email, role, expiresAt: invitation.expiresAt.toISOString() },
  })

  revalidateTeam()
  return { invitationId: invitation.id }
}

const invitationIdSchema = z.object({ invitationId: z.string().trim().min(1) })

export async function cancelClinicInvitationAction(input: unknown) {
  const session = await requireClinicManager()
  const { invitationId } = invitationIdSchema.parse(input)

  // Scoped by organizationId so a manager of one clinic can't cancel another
  // clinic's invitation by guessing an id.
  const result = await prisma.invitation.updateMany({
    where: { id: invitationId, organizationId: session.scope },
    data: { status: "canceled" },
  })
  if (result.count === 0) {
    // An id belonging to another clinic looks identical to one that does not
    // exist. Recorded, because an id tried against the wrong tenant is worth
    // being able to see later.
    await recordDenied({
      action: "membership.invitation_cancelled",
      subjectType: "membership",
      subjectId: invitationId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { reason: "not_in_tenant_or_missing" },
    })
    throw new Error("Invitation not found")
  }

  await recordAudit({
    action: "membership.invitation_cancelled",
    subjectType: "membership",
    subjectId: invitationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
  })

  revalidateTeam()
}

const memberRoleSchema = z.object({
  memberId: z.string().trim().min(1),
  role: z.enum(["admin", "member"]),
})

export async function updateClinicMemberRoleAction(input: unknown) {
  const session = await requireClinicManager()
  const { memberId, role } = memberRoleSchema.parse(input)

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: session.scope },
    select: { id: true, role: true, status: true },
  })
  if (!member) throw new Error("Member not found")
  // Shared with the admin path so the two cannot drift apart.
  assertCanChangeRole(member)

  await prisma.member.update({ where: { id: memberId }, data: { role } })

  await recordAudit({
    action: "membership.role_changed",
    subjectType: "membership",
    subjectId: member.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { from: member.role, to: role },
  })

  revalidateTeam()
}

const memberIdSchema = z.object({ memberId: z.string().trim().min(1) })

/**
 * Revokes a membership.
 *
 * A state change, not a delete. Removing the row would destroy the record
 * that the relationship ever existed, which is exactly what an audit of who
 * had access to a clinic needs to show. Member.status carries the lifecycle
 * for this reason; nothing else was ever writing it.
 */
export async function removeClinicMemberAction(input: unknown) {
  const session = await requireClinicManager()
  const { memberId } = memberIdSchema.parse(input)

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: session.scope },
    select: { id: true, role: true, userId: true, status: true },
  })
  if (!member) throw new Error("Member not found")
  assertCanRevoke(member)

  // Tier A: revoking access and recording that it was revoked commit together.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    await tx.member.update({
      where: { id: memberId },
      data: { status: "revoked" },
    })

    await recordAuditIn(tx, {
      action: "membership.revoked",
      subjectType: "membership",
      subjectId: member.id,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      requestId,
      metadata: { targetUserId: member.userId, previousStatus: member.status },
    })
  })

  revalidateTeam()
}

const memberStatusSchema = z.object({
  memberId: z.string().trim().min(1),
  status: z.enum(["active", "suspended"]),
})

/**
 * Suspends or reinstates a membership.
 *
 * Suspension is reversible and revocation is not, which is why they are
 * separate actions rather than one status field the caller sets freely: a
 * revoked membership cannot be handed back by flipping an enum.
 */
export async function setClinicMemberStatusAction(input: unknown) {
  const session = await requireClinicManager()
  const { memberId, status } = memberStatusSchema.parse(input)

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: session.scope },
    select: { id: true, role: true, userId: true, status: true },
  })
  if (!member) throw new Error("Member not found")
  assertCanSetStatus(member, status)

  // Tier A: suspension removes access, so its record must be as durable as the
  // removal. Reinstatement travels the same path rather than being split out —
  // one of the two being loseable would leave a trail that says access was
  // taken away and never given back.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    await tx.member.update({ where: { id: memberId }, data: { status } })

    await recordAuditIn(tx, {
      action: statusAuditAction(status),
      subjectType: "membership",
      subjectId: member.id,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      requestId,
      metadata: { targetUserId: member.userId, previousStatus: member.status },
    })
  })

  revalidateTeam()
}

/**
 * Accepts an invitation for the signed-in user. Matched on the invited email so
 * a forwarded link can't be redeemed by whoever happens to open it.
 *
 * Resolves the tenant and user directly rather than going through
 * requireClinicMember: the whole point is that the caller is not a member yet,
 * and that helper deliberately 404s for non-members.
 */
export async function acceptClinicInvitationAction(input: unknown) {
  const { invitationId } = invitationIdSchema.parse(input)

  const auth = await getAuthContext()
  if (!auth) throw new Error("Sign in to accept this invitation.")

  const tenantResult = await resolveTenant()
  if (tenantResult.kind !== "tenant") throw new Error("Unknown clinic.")
  const organizationId = tenantResult.tenant.organizationId

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, role: true },
  })
  if (!user) throw new Error("Account not found.")

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId, status: "pending" },
  })
  if (!invitation) throw new Error("This invitation is no longer valid.")
  if (invitation.expiresAt < new Date()) {
    throw new Error("This invitation has expired.")
  }
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address.")
  }

  const memberId = randomUUID()

  await prisma.$transaction(async (tx) => {
    await tx.member.create({
      data: {
        id: memberId,
        organizationId,
        userId: user.id,
        role: invitation.role ?? "member",
      },
    })
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    })
    // Same rule as provisioning: only promote a plain user, never overwrite an
    // existing platform role.
    if (user.role === "user" || user.role === null) {
      await tx.user.update({
        where: { id: user.id },
        data: { role: "company_admin" },
      })
    }
  })

  // The moment someone actually gains access to a tenant's data. Every other
  // membership transition was already recorded; without this one the log shows
  // people being invited, suspended and revoked but never arriving.
  //
  // The actor and the subject are the same person here — nobody grants this but
  // the invitee, by accepting — so the inviter is carried in the metadata to
  // keep the chain of authority readable.
  await recordAudit({
    action: "membership.created",
    subjectType: "membership",
    subjectId: memberId,
    actorId: user.id,
    actorRole: invitation.role ?? "member",
    organizationId,
    metadata: {
      invitationId: invitation.id,
      invitedBy: invitation.inviterId,
      role: invitation.role ?? "member",
    },
  })

  revalidateTeam()
}
