"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import type { Booking } from "@/generated/prisma/client"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import {
  confirmBookingPaymentSchema,
  confirmBookingStripePaymentSchema,
  startBookingCheckoutSchema,
} from "@/lib/experts/booking-schemas"
import { formatSlotLabel } from "@/lib/experts/format"
import { toPaymentStatus } from "@/lib/experts/payment-status"
import { getPaymentCurrency, getPaymentDriver } from "@/lib/payments"
import type { PaymentIntent } from "@/lib/payments/types"
import { createVideoRoomForBooking } from "@/lib/video/daily"

type ActionError = { ok: false; error: string }
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ActionResult<T = {}> = ({ ok: true } & T) | ActionError

class SlotTakenError extends Error {}

function revalidateBookings() {
  revalidatePath("/dashboard/appointments")
  revalidatePath("/expert")
}

export type StartBookingResult = ActionResult<{
  bookingId: string
  amountCents: number
  currency: string
  provider: string
  clientSecret?: string
  expertName: string
  slotLabel: string
}>

export async function startBookingCheckoutAction(
  input: unknown,
): Promise<StartBookingResult> {
  const session = await requireSession()
  const parsed = startBookingCheckoutSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a time" }
  }

  const [slot, profile] = await Promise.all([
    prisma.expertAvailabilitySlot.findUnique({
      where: { id: parsed.data.slotId },
      include: { expert: { include: { user: { select: { name: true } } } } },
    }),
    prisma.billingProfile.findUnique({ where: { userId: session.user.id } }),
  ])

  if (!slot || slot.isBooked || slot.startTime <= new Date()) {
    return { ok: false, error: "That time is no longer available" }
  }
  if (slot.expert.status !== "approved" || !slot.expert.isAcceptingBookings) {
    return { ok: false, error: "This expert isn't accepting bookings right now" }
  }
  if (!profile) {
    return { ok: false, error: "Add your billing details before checking out" }
  }

  const currency = getPaymentCurrency()
  const bookingId = randomUUID()
  const driver = getPaymentDriver()

  const intent = await driver.createIntent({
    paymentId: bookingId,
    amountCents: slot.expert.consultationPriceCents,
    currency,
    description: `Consultation with ${slot.expert.user.name}`,
    customerEmail: profile.email,
    customerName: profile.fullName,
  })

  try {
    await prisma.$transaction(async (tx) => {
      // Atomic claim: only succeeds if the slot is still unbooked, so two
      // people racing to book the same slot can't both win.
      const claim = await tx.expertAvailabilitySlot.updateMany({
        where: { id: slot.id, isBooked: false },
        data: { isBooked: true },
      })
      if (claim.count === 0) {
        throw new SlotTakenError()
      }

      await tx.booking.create({
        data: {
          id: bookingId,
          userId: session.user.id,
          expertId: slot.expertId,
          slotId: slot.id,
          notes: parsed.data.notes,
          status: "pending_payment",
          amountCents: slot.expert.consultationPriceCents,
          currency,
          paymentProvider: driver.id,
          paymentRef: intent.ref,
        },
      })
    })
  } catch (error) {
    // Distinguish a genuine double-booking from a transient DB error (the
    // remote dev database drops connections under load) — telling the user
    // someone else took their slot when the real cause was a dropped
    // connection is actively misleading and sends them off looking for a
    // slot that was never actually gone.
    if (error instanceof SlotTakenError) {
      return { ok: false, error: "That time was just booked by someone else. Pick another." }
    }
    console.error("startBookingCheckoutAction: transaction failed", error)
    return { ok: false, error: "Something went wrong starting checkout. Please try again." }
  }

  return {
    ok: true,
    bookingId,
    amountCents: slot.expert.consultationPriceCents,
    currency,
    provider: driver.id,
    clientSecret: intent.clientSecret,
    expertName: slot.expert.user.name,
    slotLabel: formatSlotLabel(slot.startTime, slot.endTime),
  }
}

export type ConfirmBookingResult = ActionResult<{
  status: "succeeded" | "requires_action"
}>

export async function confirmBookingPaymentAction(
  input: unknown,
): Promise<ConfirmBookingResult> {
  const session = await requireSession()
  const parsed = confirmBookingPaymentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your card details",
    }
  }

  const booking = await loadPayableBooking(parsed.data.bookingId, session.user.id)
  if ("result" in booking) return booking.result

  const driver = getPaymentDriver()
  const intent = await driver.confirmIntent({
    ref: booking.paymentRef!,
    amountCents: booking.amountCents,
    currency: booking.currency,
    card: parsed.data.card,
    previousStatus: toPaymentStatus(booking.status),
  })

  return finalizeBookingIntent(booking, intent)
}

export async function confirmBookingStripePaymentAction(
  input: unknown,
): Promise<ConfirmBookingResult> {
  const session = await requireSession()
  const parsed = confirmBookingStripePaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Booking not found" }
  }

  const booking = await loadPayableBooking(parsed.data.bookingId, session.user.id)
  if ("result" in booking) return booking.result

  const driver = getPaymentDriver()
  const intent = await driver.confirmIntent({
    ref: booking.paymentRef!,
    amountCents: booking.amountCents,
    currency: booking.currency,
    previousStatus: toPaymentStatus(booking.status),
  })

  return finalizeBookingIntent(booking, intent)
}

async function loadPayableBooking(
  bookingId: string,
  userId: string,
): Promise<Booking | { result: ConfirmBookingResult }> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
  })

  if (!booking) {
    return { result: { ok: false, error: "Booking not found" } }
  }
  if (booking.status === "confirmed" || booking.status === "completed") {
    return { result: { ok: true, status: "succeeded" } }
  }
  if (booking.status === "cancelled" || booking.status === "no_show") {
    return { result: { ok: false, error: "This booking is no longer available" } }
  }

  return booking
}

function failureMessage(reason?: string | null): string {
  switch (reason) {
    case "card_declined":
      return "Your card was declined"
    case "insufficient_funds":
      return "Your card has insufficient funds"
    default:
      return "The payment could not be completed"
  }
}

export async function finalizeBookingIntent(
  booking: Booking,
  intent: PaymentIntent,
): Promise<ConfirmBookingResult> {
  const cardBrand = intent.cardBrand ?? null
  const cardLast4 = intent.cardLast4 ?? null

  if (intent.status !== "succeeded") {
    const isRequiresAction = intent.status === "requires_action"

    await prisma.booking.updateMany({
      where: { id: booking.id, status: { in: ["pending_payment"] } },
      data: {
        status: isRequiresAction ? "pending_payment" : "cancelled",
        cardBrand,
        cardLast4,
        paymentFailureReason: intent.failureReason ?? null,
        ...(isRequiresAction
          ? {}
          : { cancelledAt: new Date(), cancellationReason: "payment_failed" }),
      },
    })

    if (!isRequiresAction) {
      // Release the slot so someone else can book it.
      await prisma.expertAvailabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      })
    }

    revalidateBookings()
    return isRequiresAction
      ? { ok: true, status: "requires_action" }
      : { ok: false, error: failureMessage(intent.failureReason) }
  }

  // Compare-and-set: only the attempt that flips the row to confirmed
  // creates the video room, so a double submit can't create two rooms.
  const claimed = await prisma.booking.updateMany({
    where: { id: booking.id, status: { in: ["pending_payment"] } },
    data: {
      status: "confirmed",
      paidAt: new Date(),
      confirmedAt: new Date(),
      cardBrand,
      cardLast4,
      paymentFailureReason: null,
    },
  })

  if (claimed.count > 0) {
    const slot = await prisma.expertAvailabilitySlot.findUnique({
      where: { id: booking.slotId },
    })
    if (slot) {
      try {
        const room = await createVideoRoomForBooking(
          booking.id,
          slot.startTime,
          slot.endTime,
        )
        if (room) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { videoRoomUrl: room.url, videoRoomName: room.name },
          })
        }
      } catch (error) {
        // Booking is still confirmed and paid; the room can be retried
        // later. Never fail a paid booking over a video-room hiccup.
        console.error("Video room creation failed", { bookingId: booking.id, error })
      }
    }
  }

  revalidateBookings()
  return { ok: true, status: "succeeded" }
}
