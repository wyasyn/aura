import { GoogleGenAI } from "@google/genai"

/**
 * Minimal property-assertion harness for model evals.
 *
 * Evals differ from the unit suite in two ways: they cost money and they are
 * non-deterministic. So they never run under `npm test`. They are opt-in via
 * `npm run eval`, they assert properties rather than exact strings, and a run
 * reports a score rather than throwing on the first disagreement, because the
 * useful signal is "how many cases held" across a prompt change, not which one
 * failed first.
 */

export type CheckResult = {
  name: string
  passed: boolean
  detail?: string
}

export type CaseResult = {
  caseId: string
  checks: CheckResult[]
  error?: string
}

export class Checks {
  private readonly results: CheckResult[] = []

  ok(name: string, passed: boolean, detail?: string): void {
    this.results.push({ name, passed, detail })
  }

  equal(name: string, actual: unknown, expected: unknown): void {
    this.ok(
      name,
      actual === expected,
      actual === expected ? undefined : `expected ${String(expected)}, got ${String(actual)}`,
    )
  }

  all(): CheckResult[] {
    return this.results
  }
}

export function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.error(
      "GEMINI_API_KEY is required to run evals. These call the real model and cost money.",
    )
    process.exit(1)
  }
  return key
}

export function evalModelId(): string {
  return process.env.EVAL_MODEL_ID ?? "gemini-2.5-flash"
}

export function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireApiKey() })
}

export function report(title: string, results: CaseResult[]): boolean {
  let totalChecks = 0
  let passedChecks = 0
  let failedCases = 0

  console.log(`\n${title}`)
  console.log("=".repeat(title.length))

  for (const result of results) {
    if (result.error) {
      failedCases += 1
      console.log(`\n  ${result.caseId}: ERROR ${result.error}`)
      continue
    }

    const failures = result.checks.filter((check) => !check.passed)
    totalChecks += result.checks.length
    passedChecks += result.checks.length - failures.length

    const status = failures.length === 0 ? "pass" : `${failures.length} failed`
    console.log(`\n  ${result.caseId}: ${status}`)
    for (const failure of failures) {
      console.log(`    x ${failure.name}${failure.detail ? `: ${failure.detail}` : ""}`)
    }
  }

  const rate = totalChecks === 0 ? 0 : (passedChecks / totalChecks) * 100
  console.log(
    `\n  ${passedChecks}/${totalChecks} checks passed (${rate.toFixed(1)}%), ${failedCases} case errors\n`,
  )

  return failedCases === 0 && passedChecks === totalChecks
}

/** Runs cases with limited concurrency so a whole suite is not serialized. */
export async function runCases<T>(
  cases: T[],
  concurrency: number,
  run: (item: T) => Promise<CaseResult>,
): Promise<CaseResult[]> {
  const results: CaseResult[] = []
  let cursor = 0

  const workers = Array.from({ length: Math.min(concurrency, cases.length) }, async () => {
    while (cursor < cases.length) {
      const index = cursor
      cursor += 1
      results[index] = await run(cases[index])
    }
  })

  await Promise.all(workers)
  return results
}
