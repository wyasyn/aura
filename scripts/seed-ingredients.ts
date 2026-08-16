/**
 * Seed ingredient reference data and backfill product ingredientList.
 * Run: npm run db:seed-ingredients
 */
import "dotenv/config"

import {
  backfillProductIngredientLists,
  seedIngredientReference,
} from "../lib/ingredients/backfill"
import { prisma } from "../lib/db/client"

async function main() {
  const seeded = await seedIngredientReference()
  const backfilled = await backfillProductIngredientLists()
  console.log(
    `Ingredient seed complete: ${seeded} reference rows, ${backfilled} products backfilled.`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
