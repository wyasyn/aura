/**
 * Domain-only data reset for scan allowance migration.
 * Keeps users, auth, products, and model rates.
 *
 * Run: npx tsx scripts/reset-domain-data.ts
 */
import "dotenv/config"

import { prisma } from "../lib/db/client"
import { grantFreeStarterScansIfNeeded } from "../lib/auth/bootstrap"

async function main() {
  console.log("Resetting domain scan data...")

  await prisma.$transaction([
    prisma.scanLedger.deleteMany(),
    prisma.scanUsage.deleteMany(),
    prisma.scanFeedback.deleteMany(),
    prisma.scanResult.deleteMany(),
    prisma.report.deleteMany(),
    prisma.scan.deleteMany(),
    prisma.scanBalance.deleteMany(),
  ])

  await prisma.user.updateMany({
    data: { scanTier: "starter" },
  })

  const users = await prisma.user.findMany({ select: { id: true } })
  for (const user of users) {
    await prisma.scanBalance.create({
      data: { userId: user.id, remaining: 0 },
    })
    await grantFreeStarterScansIfNeeded(user.id)
  }

  console.log(
    `Reset complete. Backfilled free scans for ${users.length} user(s).`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
