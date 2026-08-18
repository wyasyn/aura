import { cache } from "react"

import type { ExpertSpecialty } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

export const listApprovedExperts = cache(
  async (specialty?: ExpertSpecialty) => {
    return prisma.expertProfile.findMany({
      where: {
        status: "approved",
        isAcceptingBookings: true,
        ...(specialty ? { specialty } : {}),
      },
      include: { user: { select: { name: true, image: true } } },
      orderBy: [{ avgRating: "desc" }, { reviewCount: "desc" }],
    })
  },
)

export const getExpertProfileDetail = cache(async (expertId: string) => {
  const profile = await prisma.expertProfile.findFirst({
    where: { id: expertId, status: "approved" },
    include: {
      user: { select: { name: true, image: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!profile) return null

  const openSlots = await prisma.expertAvailabilitySlot.findMany({
    where: { expertId, isBooked: false, startTime: { gt: new Date() } },
    orderBy: { startTime: "asc" },
    take: 30,
  })

  return { profile, openSlots }
})
