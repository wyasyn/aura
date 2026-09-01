import { cache } from "react"

import { prisma } from "@/lib/db/client"

export const getMyExpertProfile = cache(async (userId: string) => {
  return prisma.expertProfile.findUnique({ where: { userId } })
})

export const getApprovedExpertProfile = cache(async (expertId: string) => {
  return prisma.expertProfile.findFirst({
    where: { id: expertId, status: "approved" },
    include: { user: { select: { name: true, image: true } } },
  })
})
