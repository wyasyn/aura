import { cache } from "react"

import { prisma } from "@/lib/db/client"

export const listActiveScanPacks = cache(async () => {
  return prisma.scanPack.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { scanCount: "asc" }],
  })
})
