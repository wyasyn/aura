/**
 * Sync Aurora product catalog from WooCommerce or fallback JSON.
 * Run: npm run db:sync-products
 */
import "dotenv/config"

import { prisma } from "../lib/db/client"
import { syncProductCatalog } from "../lib/products/ingest/sync-catalog"

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  if (!email) {
    console.error("Set BOOTSTRAP_ADMIN_EMAIL in .env")
    process.exit(1)
  }

  const admin = await prisma.user.findUnique({ where: { email } })
  if (!admin) {
    console.error(`No user found for ${email}. Sign in once via OTP first.`)
    process.exit(1)
  }

  const result = await syncProductCatalog(admin.id)
  console.log(
    `Catalog sync complete (${result.source}): ${result.created} created, ${result.updated} updated, ${result.total} total.`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
