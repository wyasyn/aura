/**
 * Sync Aurora product catalog from WooCommerce or fallback JSON.
 * Run: npm run db:sync-products
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

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

  // --fallback populates from the bundled seed file without reaching the
  // store. Never a silent substitute for a failed store call.
  const mode = process.argv.includes("--fallback") ? "fallback" : "auto"
  const result = await syncProductCatalog(admin.id, mode)

  console.log(
    [
      `Catalog sync complete (${result.source}, run ${result.runId}):`,
      `  discovered ${result.discovered}`,
      `  created    ${result.created}`,
      `  updated    ${result.updated}`,
      `  unchanged  ${result.unchanged}`,
      // Archived, never deleted — historical recommendations name products by
      // slug and must keep resolving.
      `  archived   ${result.archived}`,
      `  stale      ${result.markedStale}  (queued for re-extraction)`,
      `  failed     ${result.failed}`,
    ].join("\n"),
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
