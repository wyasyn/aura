import { prisma } from "@/lib/db/client"

export async function listMyBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId, status: { in: ["confirmed", "completed"] } },
    include: {
      slot: true,
      expert: { include: { user: { select: { name: true } } } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function listExpertBookings(expertId: string) {
  return prisma.booking.findMany({
    where: { expertId, status: { in: ["confirmed", "completed"] } },
    include: {
      slot: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

/** Joinable from 10 min before start until 30 min after end, matching the Daily.co room window. */
export function isCallJoinable(startTime: Date, endTime: Date): boolean {
  const now = Date.now()
  return (
    now >= startTime.getTime() - 10 * 60_000 &&
    now <= endTime.getTime() + 30 * 60_000
  )
}
