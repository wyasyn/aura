import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { prisma } from "@/lib/db/client"
import { DailyQuotaExhausted } from "@/lib/products/enrich/rate-limit"
import { extractProductIntelligence } from "@/lib/products/intelligence/extract-product"

/**
 * Runs the shared extraction service across the catalogue.
 *
 * This is a driver, not a second implementation. Every product — synced or
 * entered by hand — goes through `extractProductIntelligence`, so a catalogue
 * pass and a single manual creation cannot drift apart in what they produce.
 *
 * Sequential rather than parallel. The provider allows five requests a minute,
 * and a partial failure that leaves half the catalogue enriched is much easier
 * to reason about when the order is deterministic.
 */

export type EnrichOneOutcome = {
  slug: string
  completenessBefore: number
  completenessAfter: number
  status: string
  classification: string | null
  error?: string
}

export type EnrichCatalogueOptions = {
  modelId: string
  /** Enrich only these slugs. Omit for the whole catalogue. */
  slugs?: string[]
  /** Re-enrich products that already carry intelligence. */
  force?: boolean
  /** Write nothing; report what would change. */
  dryRun?: boolean
  /**
   * Pause between products, in milliseconds.
   *
   * The provider's free tier allows five requests a minute, so the default
   * paces just inside that. Raising throughput is a matter of the plan, not of
   * removing this.
   */
  delayMs?: number
  onProgress?: (outcome: EnrichOneOutcome) => void
}

/** Products the pass never reached, so a resumed run knows where to start. */
export type EnrichCatalogueResult = {
  outcomes: EnrichOneOutcome[]
  /** Set when a daily quota stopped the run early. */
  stoppedEarly: boolean
  remainingSlugs: string[]
}

const DEFAULT_DELAY_MS = 13_000

export async function enrichCatalogue(
  options: EnrichCatalogueOptions,
): Promise<EnrichCatalogueResult> {
  const products = await prisma.product.findMany({
    where: {
      ...(options.slugs?.length ? { slug: { in: options.slugs } } : {}),
      // Without `force` this takes the products that need extraction — never
      // assessed, derived from source text that has since changed, or left
      // failed by an earlier run — so an interrupted pass can be run again
      // without paying for the whole catalogue twice.
      ...(options.force
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
    select: { id: true, slug: true, completenessScore: true },
  })

  const outcomes: EnrichOneOutcome[] = []
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS
  let stoppedEarly = false
  let index = 0

  for (const product of products) {
    if (options.dryRun) {
      outcomes.push({
        slug: product.slug,
        completenessBefore: product.completenessScore,
        completenessAfter: product.completenessScore,
        status: "would extract",
        classification: null,
      })
      options.onProgress?.(outcomes[outcomes.length - 1])
      continue
    }

    // Pace between products, not before the first one.
    if (index > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    index += 1

    try {
      const result = await extractProductIntelligence(product.id, {
        force: true,
        modelId: options.modelId,
      })

      const outcome: EnrichOneOutcome = {
        slug: product.slug,
        completenessBefore: product.completenessScore,
        completenessAfter: result.ok ? result.completenessScore : product.completenessScore,
        status: result.status,
        classification: result.ok ? result.classification : null,
        ...(result.ok ? {} : { error: "error" in result ? result.error : result.reason }),
      }

      outcomes.push(outcome)
      options.onProgress?.(outcome)
    } catch (err) {
      // A daily cap will not clear during this run. Stopping keeps the report
      // honest — "18 done, 6 not reached" — instead of burying one real cause
      // under six identical failures.
      if (err instanceof DailyQuotaExhausted) {
        stoppedEarly = true
        break
      }

      const outcome: EnrichOneOutcome = {
        slug: product.slug,
        completenessBefore: product.completenessScore,
        completenessAfter: product.completenessScore,
        status: "failed",
        classification: null,
        error: err instanceof Error ? err.message : String(err),
      }
      outcomes.push(outcome)
      options.onProgress?.(outcome)
    }
  }

  const done = new Set(outcomes.map((outcome) => outcome.slug))
  const remainingSlugs = products
    .map((product) => product.slug)
    .filter((slug) => !done.has(slug))

  if (!options.dryRun && outcomes.some((outcome) => !outcome.error)) {
    // revalidateTag needs the static generation store, which a CLI run has no
    // access to. Failing to clear a cache must never discard writes that
    // already succeeded, so this is reported and swallowed rather than thrown.
    try {
      revalidateCatalogContext()
    } catch {
      console.warn(
        "[enrich] Catalogue cache not invalidated (no request context)." +
          " A running server refreshes within its revalidate window.",
      )
    }
  }

  return { outcomes, stoppedEarly, remainingSlugs }
}
