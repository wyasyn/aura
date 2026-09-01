import { ExpertBookings } from "@/components/experts/expert-bookings"
import { requireExpert } from "@/lib/auth/session"
import { isCallJoinable, listExpertBookings } from "@/lib/experts/booking-queries"
import { prisma } from "@/lib/db/client"

export async function ExpertBookingsLoader() {
  const session = await requireExpert()
  const profile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: session.user.id },
  })
  const bookings = await listExpertBookings(profile.id)

  return (
    <ExpertBookings
      bookings={bookings.map((b) => ({
        id: b.id,
        status: b.status as "confirmed" | "completed",
        videoRoomUrl: b.videoRoomUrl,
        joinable: isCallJoinable(b.slot.startTime, b.slot.endTime),
        started: b.slot.startTime <= new Date(),
        user: b.user,
        slot: b.slot,
      }))}
    />
  )
}
