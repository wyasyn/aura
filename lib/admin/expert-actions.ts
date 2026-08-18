"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

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

  await prisma.$transaction([
    prisma.expertProfile.update({
      where: { id: expertProfileId },
      data: {
        status: "approved",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: profile.userId },
      data: { role: "expert" },
    }),
  ])

  revalidateExperts()
}

const rejectSchema = z.object({
  expertProfileId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
})

export async function rejectExpertApplicationAction(input: unknown) {
  const session = await requireAdmin()
  const { expertProfileId, reason } = rejectSchema.parse(input)

  await prisma.expertProfile.update({
    where: { id: expertProfileId },
    data: {
      status: "rejected",
      rejectionReason: reason || null,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  })

  revalidateExperts()
}
