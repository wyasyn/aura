/**
 * Seeds the three clinic tiers.
 *
 * Idempotent and non-destructive: plans are matched by name, existing ones are
 * updated in place, and any plan not listed here is left alone. That matters
 * because clinics reference a plan by id — deleting and recreating would strip
 * the plan from every clinic already on it.
 *
 *   npx tsx scripts/seed-clinic-plans.ts
 */
import "dotenv/config"

import { prisma } from "../lib/db/client"
import { UNLIMITED } from "../lib/clinics/plan-limits"

const TIERS = [
  {
    name: "Starter",
    description: "For a single practitioner getting started.",
    priceCents: 4900,
    seatLimit: 3,
    monthlyScanQuota: 100,
    sortOrder: 0,
  },
  {
    name: "Clinic Pro",
    description: "For a growing clinic with a small team.",
    priceCents: 19900,
    seatLimit: 10,
    monthlyScanQuota: 500,
    sortOrder: 1,
  },
  {
    name: "Enterprise",
    description: "Unlimited staff and scans, for large or multi-site groups.",
    priceCents: 79900,
    seatLimit: UNLIMITED,
    monthlyScanQuota: UNLIMITED,
    sortOrder: 2,
  },
]

async function main() {
  for (const tier of TIERS) {
    const existing = await prisma.clinicPlan.findFirst({
      where: { name: tier.name },
      select: { id: true },
    })

    if (existing) {
      // Deliberately does not touch stripePriceId: that is wired up per
      // environment and re-seeding must not unlink a live Stripe price.
      await prisma.clinicPlan.update({
        where: { id: existing.id },
        data: { ...tier, isActive: true },
      })
      console.log(`updated  ${tier.name}`)
    } else {
      await prisma.clinicPlan.create({
        data: { ...tier, interval: "month", isActive: true },
      })
      console.log(`created  ${tier.name}`)
    }
  }

  const all = await prisma.clinicPlan.findMany({ orderBy: { sortOrder: "asc" } })
  console.log(
    "\nplans now:",
    all.map((p) => ({
      name: p.name,
      seats: p.seatLimit,
      scans: p.monthlyScanQuota,
      stripe: Boolean(p.stripePriceId),
    })),
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
