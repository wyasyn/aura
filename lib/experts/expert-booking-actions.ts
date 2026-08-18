"use server"

import { revalidatePath } from "next/cache"

import { requireExpert } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

type ActionResult = { ok: true } | { ok: false; error: string }

export async function markBookingCompletedAction(
  bookingId: string,
): Promise<ActionResult> {
  const session = await requireExpert()

  const profile = await prisma.expertProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) {
    return { ok: false, error: "Expert profile not found" }
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, expertId: profile.id },
    include: { slot: true },
  })
  if (!booking) {
    return { ok: false, error: "Booking not found" }
  }
  if (booking.status !== "confirmed") {
    return { ok: false, error: "Only a confirmed booking can be marked completed" }
  }
  if (booking.slot.startTime > new Date()) {
    return { ok: false, error: "This consultation hasn't started yet" }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "completed", completedAt: new Date() },
  })

  revalidatePath("/expert")
  revalidatePath("/dashboard/appointments")
  return { ok: true }
}
