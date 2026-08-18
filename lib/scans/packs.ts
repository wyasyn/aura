import { cache } from "react"

import { prisma } from "@/lib/db/client"

export const listActiveScanPacks = cache(async () => {
  return prisma.scanPack.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { scanCount: "asc" }],
  })
})

/** Admin view — includes inactive packs so they can be re-enabled. */
export const listAllScanPacks = cache(async () => {
  return prisma.scanPack.findMany({
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }, { scanCount: "asc" }],
  })
})
