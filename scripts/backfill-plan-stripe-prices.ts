/**
 * Creates a Stripe price for any active, paid plan that lacks one.
 *
 * Plans without a price can be assigned by an admin but cannot be bought by a
 * clinic itself, so self-serve checkout silently omits them.
 *
 *   npx tsx scripts/backfill-plan-stripe-prices.ts
 */
import "dotenv/config"

import { createStripePriceForPlan } from "../lib/clinics/stripe-price"
import { prisma } from "../lib/db/client"

async function main() {
  const plans = await prisma.clinicPlan.findMany({
    where: { isActive: true, stripePriceId: null, priceCents: { gt: 0 } },
    orderBy: { sortOrder: "asc" },
  })

  if (plans.length === 0) {
    console.log("Every active paid plan already has a Stripe price.")
    return
  }

  for (const plan of plans) {
    const priceId = await createStripePriceForPlan({
      name: plan.name,
      priceCents: plan.priceCents,
      interval: plan.interval === "year" ? "year" : "month",
      currency: plan.currency,
    })
    if (!priceId) {
      console.log(`skipped ${plan.name} (Stripe not configured)`)
      continue
    }
    await prisma.clinicPlan.update({
      where: { id: plan.id },
      data: { stripePriceId: priceId },
    })
    console.log(`${plan.name} -> ${priceId}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
