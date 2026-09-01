import { prisma } from "@/lib/db/client"
import { assessCompleteness } from "@/lib/products/completeness"
import { extractProductAttributes } from "@/lib/products/enrich/extract"
import { toEnrichmentUpdate } from "@/lib/products/enrich/normalize"
import {
  DailyQuotaExhausted,
  withRateLimitRetry,
} from "@/lib/products/enrich/rate-limit"
import { sourceHash } from "@/lib/products/ingest/source-hash"
import { statusForOutcome } from "@/lib/products/intelligence/eligibility"
import {
  markProvenance,
  readProvenance,
  type ProvenanceField,
} from "@/lib/products/intelligence/provenance"
import { parseInciList } from "@/lib/products/parse-inci"

/**
 * Extract one product's intelligence, whatever it came from.
 *
 * The single convergence point the architecture depends on. A manually entered
 * product and a WooCommerce one both arrive here; nothing downstream can tell
 * which, and there is deliberately no second implementation for either. The
 * only difference between them is how the row got into the database.
 *
 * Gemini reads one product's own description and reports what that product is.
 * It is never shown a user, a scan, or the rest of the catalogue, so it has
 * nothing to express a preference between — this is extraction, not
 * recommendation, and the two are different responsibilities.
 *
 * This runs inline, in whichever caller invokes it, and that caller waits. Two
 * kinds of caller do: creating a product, where blocking for one model call is
 * the point — the administrator learns immediately whether the product is
 * usable — and the queue drain, where the wait is the worker's rather than
 * anybody's. Bulk work goes through the queue precisely so nothing has to sit
 * in a browser waiting for it; see lib/products/jobs.
 *
 * What it never does is take the product down with it. Persistence and
 * extraction are separate steps, and a failure here leaves a saved product with
 * a recorded reason and a retry available.
 */

/** The fields an extraction writes, and therefore may claim as its own. */
const EXTRACTED_FIELDS: readonly ProvenanceField[] = [
  "primaryClassification",
  "secondaryClassifications",
  "suitableSkinTypes",
  "cosmeticBenefits",
  "climateTags",
  "suitableHumidity",
  "suitableTemperature",
  "suitableUv",
  "routineCategory",
  "ingredientList",
  "targetConcerns",
]

/**
 * How long an in-flight claim is believed.
 *
 * A process killed between claiming a product and finishing leaves it reading
 * `extracting` forever, and the guard below would then skip it on every future
 * attempt — a single terminated function would strand one product permanently.
 * Past this window the claim is treated as abandoned rather than active. Longer
 * than any single extraction takes, so a genuinely running one is never
 * interrupted.
 */
const CLAIM_BELIEVED_FOR_MS = 10 * 60 * 1000

function isRecentlyClaimed(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() < CLAIM_BELIEVED_FOR_MS
}

export const DEFAULT_EXTRACTION_MODEL = "gemini-2.5-flash"

export function extractionModelId(): string {
  return process.env.PRODUCT_ENRICHMENT_MODEL?.trim() || DEFAULT_EXTRACTION_MODEL
}

export type ExtractProductResult =
  | {
      ok: true
      status: "extracted" | "needs_review"
      completenessScore: number
      missing: string[]
      classification: string | null
    }
  | { ok: false; status: "failed"; error: string }
  | { ok: false; status: "skipped"; reason: string }

/**
 * Runs extraction for one product and records the outcome.
 *
 * Idempotent by status. A product already being extracted is skipped rather
 * than extracted twice, so a refreshed page or a double-submitted form cannot
 * start a second model call for the same row. An explicit retry passes `force`,
 * which is the difference between "this happened again by accident" and "the
 * administrator asked for it".
 */
export async function extractProductIntelligence(
  productId: string,
  options: { force?: boolean; modelId?: string } = {},
): Promise<ExtractProductResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      ingredients: true,
      ingredientList: true,
      brand: true,
      targetConcerns: true,
      primaryClassification: true,
      imageUrl: true,
      priceCents: true,
      intelligenceStatus: true,
      intelligenceProvenance: true,
      updatedAt: true,
    },
  })

  if (!product) {
    return { ok: false, status: "skipped", reason: "Product not found" }
  }

  if (
    product.intelligenceStatus === "extracting" &&
    !options.force &&
    isRecentlyClaimed(product.updatedAt)
  ) {
    return {
      ok: false,
      status: "skipped",
      reason: "An extraction is already running for this product",
    }
  }

  // Kept so a quota stop can put it back: an extraction that never ran must not
  // leave the product looking mid-flight.
  const previousStatus = product.intelligenceStatus

  // Claimed before the model call so a concurrent request sees it. Not a lock —
  // two simultaneous calls could still both read `pending` — but it closes the
  // ordinary case of a refreshed page, and the cost of the rare double
  // extraction is a duplicate model call, not corrupted data.
  await prisma.product.update({
    where: { id: product.id },
    data: { intelligenceStatus: "extracting", intelligenceError: null },
  })

  try {
    const { extraction } = await withRateLimitRetry(() =>
      extractProductAttributes(
        {
          slug: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          ingredients: product.ingredients,
        },
        options.modelId ?? extractionModelId(),
      ),
    )

    const update = toEnrichmentUpdate(extraction, {
      brand: product.brand,
      targetConcerns: product.targetConcerns,
      primaryClassification: product.primaryClassification,
    })

    const parsed = parseInciList(product.ingredients ?? "")
    const ingredientList = [
      ...new Set([
        ...product.ingredientList,
        ...(parsed.isLikelyInciList ? parsed.items : []),
        ...extraction.keyIngredients.map((item) => item.trim()).filter(Boolean),
      ]),
    ]

    const { score, missing } = assessCompleteness({
      name: product.name,
      description: product.description,
      brand: update.brand,
      imageUrl: product.imageUrl,
      primaryClassification: update.primaryClassification,
      targetConcerns: update.targetConcerns,
      suitableSkinTypes: update.suitableSkinTypes,
      cosmeticBenefits: update.cosmeticBenefits,
      climateTags: update.climateTags,
      ingredients: ingredientList.join(", "),
      routineCategory: update.routineCategory,
      priceCents: product.priceCents,
    })

    const status = statusForOutcome({
      classified: update.primaryClassification !== null,
      completenessScore: score,
      missing,
    })

    await prisma.product.update({
      where: { id: product.id },
      data: {
        ...update,
        ingredientList,
        completenessScore: score,
        // Records what this intelligence was derived from, so a later sync can
        // tell whether the source text has moved on.
        sourceHash: sourceHash({
          name: product.name,
          description: product.description,
          category: product.category,
          ingredients: product.ingredients ?? undefined,
        }),
        intelligenceStale: false,
        intelligenceStatus: status,
        intelligenceError: null,
        intelligenceExtractedAt: new Date(),
        // Only the fields this pass actually wrote. An administrator who
        // corrected one of them keeps their attribution until an extraction
        // overwrites that field specifically.
        intelligenceProvenance: markProvenance(
          readProvenance(product.intelligenceProvenance),
          EXTRACTED_FIELDS,
          "extraction",
        ),
      },
    })

    return {
      ok: true,
      status,
      completenessScore: score,
      missing,
      classification: update.primaryClassification,
    }
  } catch (err) {
    // A daily provider quota is an environmental limit, not a fact about this
    // product: the extraction never ran. Recording it as a failure blames the
    // row for a condition it did not cause, and on a catalogue pass it marks
    // every remaining product broken after one exhausted key. The status is put
    // back and the error is re-thrown so the caller can stop the whole run.
    if (err instanceof DailyQuotaExhausted) {
      await prisma.product.update({
        where: { id: product.id },
        data: { intelligenceStatus: previousStatus },
      })
      throw err
    }

    const message = err instanceof Error ? err.message : String(err)

    // The product stays exactly as it was saved. Only the extraction failed,
    // and the reason is recorded so an administrator can decide whether to
    // retry or fix the source data.
    await prisma.product.update({
      where: { id: product.id },
      data: {
        intelligenceStatus: "failed",
        intelligenceError: message.slice(0, 500),
      },
    })

    return { ok: false, status: "failed", error: message }
  }
}
