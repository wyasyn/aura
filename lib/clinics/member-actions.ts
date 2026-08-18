"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthContext } from "@/lib/auth/context"
import { requireClinicManager } from "@/lib/clinics/membership"
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

  const seatLimit = session.tenant.plan?.seatLimit ?? 0
  const [memberCount, pendingCount] = await Promise.all([
    prisma.member.count({ where: { organizationId } }),
    prisma.invitation.count({ where: { organizationId, status: "pending" } }),
  ])

  if (seatLimit > 0 && memberCount + pendingCount >= seatLimit) {
    throw new Error(
      `Your plan includes ${seatLimit} seat${seatLimit === 1 ? "" : "s"}, and they are all taken or invited. Upgrade the plan to add more.`,
    )
  }
  if (seatLimit === 0) {
    throw new Error("This clinic has no plan assigned yet, so it has no seats.")
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
  if (result.count === 0) throw new Error("Invitation not found")

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
    select: { id: true, role: true },
  })
  if (!member) throw new Error("Member not found")
  // The owner is the billing contact and the last line of control; demoting
  // them would leave the clinic with no one guaranteed able to manage it.
  if (member.role === "owner") {
    throw new Error("The clinic owner's role cannot be changed.")
  }

  await prisma.member.update({ where: { id: memberId }, data: { role } })
  revalidateTeam()
}

const memberIdSchema = z.object({ memberId: z.string().trim().min(1) })

export async function removeClinicMemberAction(input: unknown) {
  const session = await requireClinicManager()
  const { memberId } = memberIdSchema.parse(input)

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: session.scope },
    select: { id: true, role: true, userId: true },
  })
  if (!member) throw new Error("Member not found")
  if (member.role === "owner") {
    throw new Error("The clinic owner cannot be removed.")
  }

  await prisma.member.delete({ where: { id: memberId } })
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

  await prisma.$transaction(async (tx) => {
    await tx.member.create({
      data: {
        id: randomUUID(),
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

  revalidateTeam()
}
