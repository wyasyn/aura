/**
 * Queue product-intelligence extraction for everything that needs it.
 *
 * Run: npm run jobs:queue -- [--force] [--slug=a,b]
 *
 * The command-line counterpart to selecting products in the admin table and
 * queueing them. It enqueues rather than extracting, so the work survives this
 * process exiting: the scheduled drain picks it up, and when the provider's
 * daily allowance is spent the jobs simply wait for it to reset instead of
 * failing.
 *
 * Prefer this over `db:enrich-products` for anything large. That command
 * extracts inline and stops when the allowance runs out, leaving the rest for
 * somebody to remember; this one hands the remainder to the scheduler.
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

import { randomUUID } from "node:crypto"

import { prisma } from "../lib/db/client"
import { enqueueJob } from "../lib/products/jobs/queue"

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function value(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
}

async function main() {
  const force = flag("force")
  const slugs = value("slug")?.split(",").map((s) => s.trim()).filter(Boolean)
  const batchId = randomUUID()

  const products = await prisma.product.findMany({
    where: {
      ...(slugs?.length ? { slug: { in: slugs } } : {}),
      // Without --force this takes only what is actually due: never assessed,
      // left failed by an earlier attempt, or derived from source text that has
      // since changed.
      ...(force
        ? {}
        : {
            OR: [
              { intelligenceStatus: "pending" },
              { intelligenceStatus: "failed" },
              { intelligenceStale: true },
            ],
          }),
    },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, organizationId: true },
  })

  if (products.length === 0) {
    console.log("Nothing to queue — every product's intelligence is current.")
    return
  }

  let queued = 0
  let already = 0

  for (const product of products) {
    const result = await enqueueJob({
      kind: "intelligence_extraction",
      productId: product.id,
      organizationId: product.organizationId,
      batchId,
      force,
    })

    if (result.enqueued) {
      queued += 1
      console.log(`  queued  ${product.slug}`)
    } else {
      already += 1
      console.log(`  already ${product.slug}`)
    }
  }

  console.log(
    `\n${queued} queued${already > 0 ? `, ${already} already outstanding` : ""}.` +
      `\nBatch ${batchId}.` +
      `\n\nThe scheduled drain will work through these. To run them here instead:` +
      `\n  npm run jobs:drain`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
