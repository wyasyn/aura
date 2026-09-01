/**
 * Populate the product intelligence columns from each product's own description.
 *
 * Run: npm run db:enrich-products -- [--dry-run] [--force] [--slug=a,b]
 *
 * Gemini reads one product at a time and reports what that product is. It never
 * sees a user, a scan or the rest of the catalogue, so it cannot express a
 * preference between products. Choosing between them is the engine's job and
 * happens later, from the columns this writes.
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

import { prisma } from "../lib/db/client"
import { enrichCatalogue } from "../lib/products/enrich/run"
import { linkProductIngredients, seedIngredientReference } from "../lib/ingredients/backfill"

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function value(name: string): string | undefined {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

async function main() {
  const modelId = process.env.PRODUCT_ENRICHMENT_MODEL ?? "gemini-2.5-flash"
  const dryRun = flag("dry-run")
  const slugs = value("slug")?.split(",").map((s) => s.trim()).filter(Boolean)

  console.log(
    `Enriching with ${modelId}${dryRun ? " (dry run — nothing written)" : ""}`,
  )

  if (!dryRun) {
    const seeded = await seedIngredientReference()
    console.log(`Ingredient reference: ${seeded} rows upserted`)
  }

  const { outcomes, stoppedEarly, remainingSlugs } = await enrichCatalogue({
    modelId,
    dryRun,
    force: flag("force"),
    slugs,
    delayMs: value("delay-ms") ? Number(value("delay-ms")) : undefined,
    onProgress: (o) => {
      if (o.error) {
        console.log(`  ✗ ${o.slug}: ${o.error}`)
        return
      }
      console.log(
        `  ✓ ${o.slug}: ${o.completenessBefore}% → ${o.completenessAfter}%` +
          ` [${o.classification ?? "unclassified"}] ${o.status}`,
      )
    },
  })

  const ok = outcomes.filter((o) => !o.error)
  const failed = outcomes.filter((o) => o.error)

  if (!dryRun && ok.length > 0) {
    const links = await linkProductIngredients()
    console.log(
      `\nIngredient links: ${links.linksWritten} across ${links.productsLinked}` +
        ` of ${links.productsExamined} products`,
    )
  }

  const avgBefore = average(ok.map((o) => o.completenessBefore))
  const avgAfter = average(ok.map((o) => o.completenessAfter))
  console.log(
    `\n${ok.length} enriched, ${failed.length} failed.` +
      ` Average completeness ${avgBefore}% → ${avgAfter}%`,
  )

  if (stoppedEarly) {
    console.log(
      `\nStopped early: the daily Gemini quota is exhausted.` +
        ` ${remainingSlugs.length} products were not reached.` +
        `\nResume with:\n  npm run db:enrich-products -- --slug=${remainingSlugs.join(",")}`,
    )
  }

  if (failed.length > 0 || stoppedEarly) process.exitCode = 1
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
