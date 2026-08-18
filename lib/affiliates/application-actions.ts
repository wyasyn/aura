"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { affiliateApplicationSchema } from "@/lib/affiliates/schemas"

type ActionResult = { ok: true } | { ok: false; error: string }

export async function submitAffiliateApplicationAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = affiliateApplicationSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your application details",
    }
  }

  const existing = await prisma.affiliateProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (existing?.status === "approved") {
    return { ok: false, error: "You're already an approved affiliate" }
  }

  const data = parsed.data

  // A pending application can be edited in place; a rejected one can be
  // resubmitted, which puts it back in the review queue.
  await prisma.affiliateProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...data,
    },
    update: {
      ...data,
      status: "pending",
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  })

  revalidatePath("/dashboard/affiliate-application")
  return { ok: true }
}
