"use server"

import { revalidatePath } from "next/cache"

import { requireExpert } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { addAvailabilitySlotSchema } from "@/lib/experts/availability-schemas"

async function requireOwnExpertProfile() {
  const session = await requireExpert()
  const profile = await prisma.expertProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile || profile.status !== "approved") {
    throw new Error("Expert profile not found")
  }
  return profile
}

type ActionResult = { ok: true } | { ok: false; error: string }

export async function addAvailabilitySlotAction(
  input: unknown,
): Promise<ActionResult> {
  const profile = await requireOwnExpertProfile()
  const parsed = addAvailabilitySlotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the time range",
    }
  }

  try {
    await prisma.expertAvailabilitySlot.create({
      data: {
        expertId: profile.id,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
      },
    })
  } catch {
    return { ok: false, error: "You already have a slot starting at that time" }
  }

  revalidatePath("/expert/availability")
  return { ok: true }
}

export async function removeAvailabilitySlotAction(
  slotId: string,
): Promise<ActionResult> {
  const profile = await requireOwnExpertProfile()

  const slot = await prisma.expertAvailabilitySlot.findUnique({
    where: { id: slotId },
  })
  if (!slot || slot.expertId !== profile.id) {
    return { ok: false, error: "Slot not found" }
  }
  if (slot.isBooked) {
    return { ok: false, error: "This slot is already booked" }
  }

  await prisma.expertAvailabilitySlot.delete({ where: { id: slotId } })
  revalidatePath("/expert/availability")
  return { ok: true }
}
