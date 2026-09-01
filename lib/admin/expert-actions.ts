"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAuditIn } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

function revalidateExperts() {
  revalidatePath("/admin/experts")
}

export async function approveExpertApplicationAction(expertProfileId: string) {
  const session = await requireAdmin()

  const profile = await prisma.expertProfile.findUnique({
    where: { id: expertProfileId },
  })
  if (!profile) {
    throw new Error("Application not found")
  }

  // Approval grants a platform role, so it belongs in the trail beside the
  // other privilege grants. The transaction already existed — the record joins
  // it rather than trailing behind it, which costs nothing and means the role
  // and the reason it was granted can never disagree.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    await tx.expertProfile.update({
      where: { id: expertProfileId },
      data: {
        status: "approved",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    })

    await tx.user.update({
      where: { id: profile.userId },
      data: { role: "expert" },
    })

    await recordAuditIn(tx, {
      action: "expert.approved",
      subjectType: "expert",
      subjectId: expertProfileId,
      actorId: session.user.id,
      actorRole: "admin",
      requestId,
      metadata: { targetUserId: profile.userId, grantedRole: "expert" },
    })
  })

  revalidateExperts()
}

const rejectSchema = z.object({
  expertProfileId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
})

export async function rejectExpertApplicationAction(input: unknown) {
  const session = await requireAdmin()
  const { expertProfileId, reason } = rejectSchema.parse(input)

  // The rejection reason is the applicant's own submission being judged, not
  // third-party data, and it is already stored on the profile — recording it
  // here keeps the decision and its stated grounds together.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    const updated = await tx.expertProfile.update({
      where: { id: expertProfileId },
      data: {
        status: "rejected",
        rejectionReason: reason || null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
      select: { userId: true },
    })

    await recordAuditIn(tx, {
      action: "expert.rejected",
      subjectType: "expert",
      subjectId: expertProfileId,
      actorId: session.user.id,
      actorRole: "admin",
      requestId,
      metadata: { targetUserId: updated.userId, hasReason: Boolean(reason) },
    })
  })

  revalidateExperts()
}
