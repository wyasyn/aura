"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { submitReviewSchema } from "@/lib/experts/review-schemas"

type ActionResult = { ok: true } | { ok: false; error: string }

export async function submitExpertReviewAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = submitReviewSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your review",
    }
  }

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, userId: session.user.id },
    include: { review: true },
  })

  if (!booking) {
    return { ok: false, error: "Booking not found" }
  }
  if (booking.status !== "completed") {
    return { ok: false, error: "You can review a consultation after it's completed" }
  }
  if (booking.review) {
    return { ok: false, error: "You've already reviewed this consultation" }
  }

  await prisma.$transaction(async (tx) => {
    await tx.expertReview.create({
      data: {
        bookingId: booking.id,
        userId: session.user.id,
        expertId: booking.expertId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      },
    })

    const agg = await tx.expertReview.aggregate({
      where: { expertId: booking.expertId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await tx.expertProfile.update({
      where: { id: booking.expertId },
      data: {
        avgRating: agg._avg.rating ?? null,
        reviewCount: agg._count.rating,
      },
    })
  })

  revalidatePath("/dashboard/appointments")
  revalidatePath(`/experts/${booking.expertId}`)
  return { ok: true }
}
