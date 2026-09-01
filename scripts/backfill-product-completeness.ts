import "dotenv/config"

import { prisma } from "../lib/db/client"
import { assessCompleteness } from "../lib/products/completeness"

/**
 * Recomputes Product.completenessScore for every product.
 *
 * The column defaults to 0, which would read as "nothing known" for the whole
 * existing catalogue until each product happened to be edited. Run once after
 * the product-intelligence migration, and again any time the scoring criteria
 * change — the score is derived, so it is only ever as current as the last run.
 *
 * Touches no field but the score. Safe to run repeatedly.
 */
async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      brand: true,
      imageUrl: true,
      primaryClassification: true,
      targetConcerns: true,
      suitableSkinTypes: true,
      cosmeticBenefits: true,
      climateTags: true,
      ingredientList: true,
      ingredients: true,
      routineCategory: true,
      priceCents: true,
      completenessScore: true,
    },
  })

  let changed = 0
  const missingCounts = new Map<string, number>()

  for (const product of products) {
    const report = assessCompleteness(product)

    for (const label of report.missing) {
      missingCounts.set(label, (missingCounts.get(label) ?? 0) + 1)
    }

    if (report.score !== product.completenessScore) {
      await prisma.product.update({
        where: { id: product.id },
        data: { completenessScore: report.score },
      })
      changed += 1
    }
  }

  const scores = products.map((p) => assessCompleteness(p).score)
  const average = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0

  console.log(`products: ${products.length}, scores updated: ${changed}`)
  console.log(`average completeness: ${average}%`)
  console.log("\nmost commonly missing:")
  for (const [label, count] of [...missingCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)} / ${products.length}  ${label}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
