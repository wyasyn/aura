/**
 * Seed scan pack catalog for tier-based pricing.
 * Run after migrations: npm run db:seed-packs
 */
import "dotenv/config"

import type { ScanTier } from "../generated/prisma/client"
import { prisma } from "../lib/db/client"

type PackSeed = {
  slug: string
  tier: ScanTier
  scanCount: number
  priceCents: number
  label: string
  sortOrder: number
}

const PACKS: PackSeed[] = [
  {
    slug: "starter-standard",
    tier: "starter",
    scanCount: 20,
    priceCents: 999,
    label: "Starter — 20 scans",
    sortOrder: 10,
  },
  {
    slug: "starter-volume",
    tier: "starter",
    scanCount: 50,
    priceCents: 1999,
    label: "Starter — 50 scans",
    sortOrder: 11,
  },
  {
    slug: "plus-standard",
    tier: "plus",
    scanCount: 12,
    priceCents: 1499,
    label: "Plus — 12 scans",
    sortOrder: 20,
  },
  {
    slug: "plus-volume",
    tier: "plus",
    scanCount: 30,
    priceCents: 3499,
    label: "Plus — 30 scans",
    sortOrder: 21,
  },
  {
    slug: "pro-standard",
    tier: "pro",
    scanCount: 10,
    priceCents: 2499,
    label: "Pro — 10 scans",
    sortOrder: 30,
  },
  {
    slug: "pro-volume",
    tier: "pro",
    scanCount: 25,
    priceCents: 4999,
    label: "Pro — 25 scans",
    sortOrder: 31,
  },
]

async function main() {
  for (const pack of PACKS) {
    const existing = await prisma.scanPack.findFirst({
      where: { label: pack.label },
    })

    if (existing) {
      await prisma.scanPack.update({
        where: { id: existing.id },
        data: {
          tier: pack.tier,
          scanCount: pack.scanCount,
          priceCents: pack.priceCents,
          sortOrder: pack.sortOrder,
          isActive: true,
        },
      })
    } else {
      await prisma.scanPack.create({
        data: {
          tier: pack.tier,
          scanCount: pack.scanCount,
          priceCents: pack.priceCents,
          label: pack.label,
          sortOrder: pack.sortOrder,
          isActive: true,
        },
      })
    }
  }

  console.log(`Seeded ${PACKS.length} scan packs`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
