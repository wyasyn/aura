import { prisma } from "@/lib/db/client"

export async function listMyAvailabilitySlots(expertId: string) {
  return prisma.expertAvailabilitySlot.findMany({
    where: { expertId, startTime: { gt: new Date() } },
    orderBy: { startTime: "asc" },
  })
}

export async function listOpenSlotsForExpert(expertId: string) {
  return prisma.expertAvailabilitySlot.findMany({
    where: { expertId, isBooked: false, startTime: { gt: new Date() } },
    orderBy: { startTime: "asc" },
  })
}
