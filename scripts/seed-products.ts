/**
 * Seed Aurora product catalog from scripts/data/products_fallback.json
 * Run: npm run db:seed-products
 */
import "dotenv/config"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { prisma } from "../lib/db/client"
import {
  mapFallbackProduct,
  type FallbackProduct,
} from "../lib/products/seed-map"

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, "data/products_fallback.json")

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

  const raw = readFileSync(dataPath, "utf8")
  const items = JSON.parse(raw) as FallbackProduct[]

  let created = 0
  let updated = 0

  for (const item of items) {
    const data = mapFallbackProduct(item)
    const existing = await prisma.product.findUnique({
      where: { slug: data.slug },
    })

    if (existing) {
      await prisma.product.update({
        where: { slug: data.slug },
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          category: data.category,
          ingredients: data.ingredients ?? null,
          ingredientList: data.ingredientList,
          targetConcerns: data.targetConcerns,
          imageUrl: data.imageUrl ?? null,
          storeUrl: data.storeUrl ?? null,
          isActive: data.isActive,
        },
      })
      updated += 1
    } else {
      await prisma.product.create({
        data: {
          ...data,
          ingredients: data.ingredients ?? null,
          imageUrl: data.imageUrl ?? null,
          createdById: admin.id,
        },
      })
      created += 1
    }
  }

  console.log(
    `Products seed complete: ${created} created, ${updated} updated (${items.length} total).`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
