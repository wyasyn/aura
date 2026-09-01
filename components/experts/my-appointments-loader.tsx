import { MyAppointments } from "@/components/experts/my-appointments"
import { requireSession } from "@/lib/auth/session"
import { isCallJoinable, listMyBookings } from "@/lib/experts/booking-queries"

export async function MyAppointmentsLoader() {
  const session = await requireSession()
  const bookings = await listMyBookings(session.user.id)

  return (
    <MyAppointments
      bookings={bookings.map((b) => ({
        id: b.id,
        status: b.status as "confirmed" | "completed",
        amountCents: b.amountCents,
        currency: b.currency,
        videoRoomUrl: b.videoRoomUrl,
        joinable: isCallJoinable(b.slot.startTime, b.slot.endTime),
        expert: b.expert,
        slot: b.slot,
        review: b.review,
      }))}
    />
  )
}
