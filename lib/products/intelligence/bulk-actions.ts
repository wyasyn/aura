"use server"

import { revalidatePath } from "next/cache"

import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { DailyQuotaExhausted } from "@/lib/products/enrich/rate-limit"
import { extractProductIntelligence } from "@/lib/products/intelligence/extract-product"

/**
 * Bulk extraction, one product per call.
 *
 * There is no background job queue in this application. Rather than hold a
 * single request open for the length of a whole catalogue — which would hit
 * every timeout between the browser and the database, and lose all progress
 * when it did — the admin surface drives this one product at a time and shows
 * each result as it lands. The extraction itself stays entirely server-side;
 * the browser only says which product is next.
 *
 * That is a real limitation and is described rather than dressed up: closing
 * the tab stops the run. What it never does is lose completed work, because
 * every product is committed before the next one starts.
 */

export type BulkExtractOutcome =
  | { kind: "extracted"; completenessScore: number; missing: string[] }
  | { kind: "needs_review"; completenessScore: number; missing: string[] }
  | { kind: "skipped"; reason: string }
  | { kind: "failed"; error: string }
  /**
   * The provider's daily allowance is gone. Distinct from `failed` because the
   * extraction never ran — nothing about this product is wrong, and marking it
   * failed would blame the row for an account-level limit.
   */
  | { kind: "quota_exhausted" }

export type BulkExtractResult = {
  productId: string
  outcome: BulkExtractOutcome
}

/**
 * The products a bulk run should process, in a stable order.
 *
 * Selecting work here rather than trusting a list from the browser means the
 * status and stale rules decide what is actually due, so a stale page cannot
 * queue a product that has since been extracted. `force` is the administrator
 * overriding that deliberately.
 */
export async function selectProductsForExtractionAction(input: {
  productIds?: string[]
  force?: boolean
}): Promise<Array<{ id: string; name: string }>> {
  await requireAdmin()

  return prisma.product.findMany({
    where: {
      ...(input.productIds?.length ? { id: { in: input.productIds } } : {}),
      ...(input.force
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
    select: { id: true, name: true },
  })
}

/**
 * Extracts one product as part of a bulk run.
 *
 * Quota exhaustion is returned rather than thrown, so the caller can stop the
 * remaining products cleanly and leave them exactly as they were.
 */
export async function bulkExtractOneAction(
  productId: string,
  options: { force?: boolean } = {},
): Promise<BulkExtractResult> {
  await requireAdmin()

  try {
    const result = await extractProductIntelligence(productId, {
      force: options.force ?? false,
    })

    revalidatePath("/admin/products")
    revalidateCatalogContext()

    if (!result.ok) {
      return {
        productId,
        outcome:
          result.status === "failed"
            ? { kind: "failed", error: result.error }
            : { kind: "skipped", reason: result.reason },
      }
    }

    return {
      productId,
      outcome: {
        kind: result.status,
        completenessScore: result.completenessScore,
        missing: result.missing,
      },
    }
  } catch (err) {
    if (err instanceof DailyQuotaExhausted) {
      // The service already restored this product's previous status, so
      // nothing here is left claiming an extraction that did not happen.
      return { productId, outcome: { kind: "quota_exhausted" } }
    }
    throw err
  }
}
