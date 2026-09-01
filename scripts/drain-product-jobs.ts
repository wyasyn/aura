/**
 * Drain the product-intelligence job queue.
 *
 * Run: npm run jobs:drain -- [--limit=5] [--once]
 *
 * The same worker the scheduled route uses. Provided because local development
 * has no cron: without it, queued work would sit untouched on a developer's
 * machine and the queue would look broken when it is merely unattended.
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local", override: true })

import { prisma } from "../lib/db/client"
import { drainProductJobs } from "../lib/products/jobs/worker"

function value(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
}

async function main() {
  const limit = Number(value("limit") ?? 5)
  const once = process.argv.includes("--once")

  for (;;) {
    const outcome = await drainProductJobs({ limit })

    console.log(
      `claimed ${outcome.claimed}` +
        `  succeeded ${outcome.succeeded}` +
        `  retrying ${outcome.retrying}` +
        `  failed ${outcome.failed}` +
        (outcome.deferredForQuota ? "  — stopped: provider quota exhausted" : ""),
    )

    if (once || outcome.claimed === 0 || outcome.deferredForQuota) break
  }

  const remaining = await prisma.productJob.count({ where: { status: "queued" } })
  console.log(`${remaining} job(s) still queued.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
