/**
 * Report the catalogue's product-intelligence quality.
 *
 * Run: npm run db:audit-products
 *
 * Read-only. Answers the three questions that are easy to conflate — which
 * products are active, which are recommendable, and which are data complete —
 * and names the fields missing from the ones that are not.
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

import { prisma } from "../lib/db/client"
import { assessCompleteness } from "../lib/products/completeness"

function bar(value: number, width = 20): string {
  const filled = Math.round((value / 100) * width)
  return `${"█".repeat(filled)}${"·".repeat(width - filled)}`
}

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ organizationId: "asc" }, { name: "asc" }],
    include: { _count: { select: { ingredientLinks: true } } },
  })

  if (products.length === 0) {
    console.log("No products in the catalogue.")
    return
  }

  const missingTally = new Map<string, number>()
  let complete = 0

  console.log(`\nCATALOGUE — ${products.length} products\n`)

  for (const product of products) {
    const { score, missing } = assessCompleteness({
      name: product.name,
      description: product.description,
      brand: product.brand,
      imageUrl: product.imageUrl,
      primaryClassification: product.primaryClassification,
      targetConcerns: product.targetConcerns,
      suitableSkinTypes: product.suitableSkinTypes,
      cosmeticBenefits: product.cosmeticBenefits,
      climateTags: product.climateTags,
      ingredients: product.ingredients,
      routineCategory: product.routineCategory,
      priceCents: product.priceCents,
    })

    for (const field of missing) {
      missingTally.set(field, (missingTally.get(field) ?? 0) + 1)
    }
    if (missing.length === 0) complete += 1

    const owner = product.organizationId ? "clinic" : "aurora"
    const flags = [
      product.isActive ? "active" : "INACTIVE",
      product.isRecommendable ? "recommendable" : "NOT-RECOMMENDABLE",
      product.availability,
      product.verificationStatus,
    ].join(" · ")

    console.log(
      `${bar(score)} ${String(score).padStart(3)}%  ${product.slug}` +
        `\n${" ".repeat(27)}[${owner}] sku=${product.sku} ${flags}` +
        `\n${" ".repeat(27)}links=${product._count.ingredientLinks}` +
        (missing.length > 0 ? `  missing: ${missing.join(", ")}` : "  complete"),
    )
  }

  // The three states the brief is careful to distinguish, counted separately
  // because a product can be any combination of them.
  const active = products.filter((p) => p.isActive).length
  const recommendable = products.filter((p) => p.isActive && p.isRecommendable).length
  const average = Math.round(
    products.reduce((sum, p) => sum + p.completenessScore, 0) / products.length,
  )

  console.log(`\n${"─".repeat(60)}`)
  console.log(`ACTIVE          ${active} / ${products.length}`)
  console.log(`RECOMMENDABLE   ${recommendable} / ${products.length}`)
  console.log(`DATA COMPLETE   ${complete} / ${products.length}`)
  console.log(`Average stored completeness: ${average}%`)

  console.log(`\nMost commonly missing:`)
  for (const [field, count] of [...missingTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${field}`)
  }

  const bySource = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.source] = (acc[product.source] ?? 0) + 1
    return acc
  }, {})
  const linked = products.filter((product) => product.externalId).length
  const stale = products.filter((product) => product.intelligenceStale).length

  console.log(
    `\nProvenance: ${Object.entries(bySource)
      .map(([source, count]) => `${source}=${count}`)
      .join("  ")}`,
  )
  console.log(`Linked to an external id: ${linked} / ${products.length}`)
  console.log(`Intelligence stale (awaiting extraction): ${stale}`)

  // Sync history, from the persisted run rows the admin panel reads. A failed
  // run is as worth seeing as a successful one — more so, since a sync that
  // never wrote anything is otherwise indistinguishable from one nobody ran.
  const runs = await prisma.productSyncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  })

  console.log(`\nRecent syncs:`)
  if (runs.length === 0) {
    console.log(`  (none recorded)`)
  }
  for (const run of runs) {
    console.log(
      `  ${run.startedAt.toISOString()}  ${run.status.padEnd(9)} ${run.source}` +
        `  discovered=${run.discovered} created=${run.created} updated=${run.updated}` +
        ` unchanged=${run.unchanged} archived=${run.archived} stale=${run.markedStale}`,
    )
    if (run.error) console.log(`      error: ${run.error.slice(0, 120)}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
