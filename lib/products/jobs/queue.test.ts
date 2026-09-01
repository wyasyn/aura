import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

const queue = readFileSync("lib/products/jobs/queue.ts", "utf8")
const worker = readFileSync("lib/products/jobs/worker.ts", "utf8")
const actions = readFileSync("lib/products/jobs/actions.ts", "utf8")
const migration = readFileSync(
  "prisma/migrations/20260901160000_product_jobs/migration.sql",
  "utf8",
)
const cronRoute = readFileSync(
  "app/api/cron/process-product-jobs/route.ts",
  "utf8",
)

describe("claiming a job is atomic", () => {
  // Two drains can overlap — a cron tick and a manual one, or two instances of
  // the same function. If both read the same queued row the product is
  // extracted twice and the provider is billed twice for one answer.
  it("the claim is a single statement, not a read followed by a write", () => {
    assert.match(queue, /FOR UPDATE SKIP LOCKED/)
    assert.match(queue, /UPDATE "product_job"[\s\S]*RETURNING \*/)
  })

  it("the attempt is counted at claim time, not at failure", () => {
    // A worker killed mid-job never reports anything. Counting at claim is what
    // stops a job that reliably kills its function from retrying forever.
    assert.match(queue, /"attempts" = "attempts" \+ 1/)
  })

  it("a job whose lease expired can be reclaimed", () => {
    // A serverless function can be killed mid-job. Without this a single
    // terminated invocation strands a product in `running` permanently.
    assert.match(queue, /"status" = 'running'/)
    assert.match(queue, /"lockedAt" < NOW\(\)/)
    assert.match(queue, /LEASE_MINUTES/)
  })
})

describe("duplicate work is prevented by the database", () => {
  it("a partial unique index covers outstanding jobs only", () => {
    // Two administrators clicking at the same moment both reach the database,
    // and only the database can settle which wins. Restricted to unfinished
    // work so a product can be re-extracted as often as anyone likes.
    assert.match(migration, /CREATE UNIQUE INDEX "product_job_outstanding_key"/)
    assert.match(migration, /WHERE "status" IN \('queued', 'running'\)/)
  })

  it("a rejected insert is reported, not thrown", () => {
    assert.match(queue, /P2002/)
    assert.match(queue, /reason: "already_queued"/)
  })
})

describe("quota exhaustion never counts against a job", () => {
  /**
   * The quota branch alone — from the check to the break that ends it.
   *
   * Sliced rather than matched across the whole file: both `DailyQuotaExhausted`
   * and `failJob` also appear in the import block, so a file-wide pattern
   * matches the imports and proves nothing about the branch.
   */
  const quotaBranch = (() => {
    const start = worker.indexOf("err instanceof DailyQuotaExhausted")
    const rest = worker.slice(start)
    return rest.slice(0, rest.indexOf("break") + 5)
  })()

  it("the drain defers rather than failing", () => {
    // The allowance being spent is a fact about the account, not about this
    // product. Burning a retry on it would exhaust maxAttempts during an
    // outage and mark good work permanently failed.
    assert.match(quotaBranch, /deferJob\(/)
    assert.doesNotMatch(
      quotaBranch,
      /failJob/,
      "quota exhaustion must not route to failJob",
    )
  })

  it("deferring gives the attempt back", () => {
    assert.match(queue, /attempts: Math\.max\(0, job\.attempts - 1\)/)
  })

  it("the drain stops instead of marching through the rest of the queue", () => {
    assert.match(quotaBranch, /break/)
  })

  it("it waits for the allowance to reset rather than guessing an interval", () => {
    assert.match(worker, /setUTCHours\(24, 0, 0, 0\)/)
  })
})

describe("retries are bounded and backed off", () => {
  it("a job stops retrying once its attempts are spent", () => {
    assert.match(queue, /job\.attempts >= job\.maxAttempts/)
    assert.match(queue, /status: exhausted \? "failed" : "queued"/)
  })

  it("a retry is scheduled later, not immediately", () => {
    assert.match(queue, /runAfter: new Date\(Date\.now\(\) \+ backoff/)
  })
})

describe("the tenant is derived, never accepted", () => {
  // A caller who could name the organisation could queue work against a
  // catalogue they cannot otherwise reach — and the job would then be drained
  // by a background process with no session to check it against.
  it("the organisation comes from the product row", () => {
    assert.match(actions, /organizationId: product\.organizationId/)
    assert.doesNotMatch(actions, /organizationId:\s*input\./)
  })

  it("products are read back rather than trusted from the payload", () => {
    assert.match(actions, /prisma\.product\.findMany\(\{[\s\S]*?id: \{ in: input\.productIds \}/)
  })

  it("every exported action requires an administrator", () => {
    const names = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1])
    assert.ok(names.length >= 4, `expected the job actions, saw ${names.length}`)

    for (const name of names) {
      const start = actions.indexOf(`export async function ${name}`)
      const rest = actions.slice(start + 1)
      const end = rest.indexOf("\nexport ")
      const body = end < 0 ? rest : rest.slice(0, end)
      assert.match(body, /requireAdmin\(\)/, `${name} must require an administrator`)
    }
  })
})

describe("the queue survives the browser", () => {
  it("the scheduled route drains it behind the cron guard", () => {
    assert.match(cronRoute, /authorizeCronRequest\(request\)/)
    assert.match(cronRoute, /drainProductJobs\(/)
  })

  it("a scheduled pass is bounded so it cannot run forever", () => {
    assert.match(cronRoute, /limit: \d+/)
  })

  it("work is paced inside the provider allowance", () => {
    assert.match(worker, /PACE_MS/)
  })
})

describe("unimplemented work is refused, not silently succeeded", () => {
  it("a catalogue sync job throws rather than reporting success", () => {
    // A handler that quietly did nothing would report success for work that
    // never happened, and the store connector is dormant until credentials
    // are supplied.
    const branch = worker.slice(worker.indexOf('case "catalogue_sync"'))
    assert.match(branch.slice(0, 300), /throw new Error/)
  })
})

describe("an abandoned claim does not strand a product", () => {
  const service = readFileSync(
    "lib/products/intelligence/extract-product.ts",
    "utf8",
  )

  // Found by running the queue: one product sat in `extracting` from an earlier
  // direct call whose process died. The guard against double extraction would
  // then have skipped it on every future attempt, so a single terminated
  // function stranded it permanently.
  it("an in-flight claim is only believed for a bounded window", () => {
    assert.match(service, /CLAIM_BELIEVED_FOR_MS/)
    assert.match(service, /isRecentlyClaimed\(product\.updatedAt\)/)
  })

  it("the window is longer than any single extraction", () => {
    assert.match(service, /const CLAIM_BELIEVED_FOR_MS = 10 \* 60 \* 1000/)
  })
})
