"use server"

import { revalidatePath } from "next/cache"

import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { recordAudit } from "@/lib/audit/log"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { evaluateEligibility } from "@/lib/products/intelligence/eligibility"

/**
 * An administrator confirming, or withdrawing confirmation of, a product's
 * intelligence.
 *
 * Only ever an explicit act. Nothing in the extraction path sets `confirmed`,
 * and nothing here runs automatically — an automated pass saying a product is
 * organic is a derivation, and a person saying so is a warranty. Collapsing the
 * two would make the distinction the whole verification workflow rests on
 * unavailable to anyone reading the data afterwards.
 *
 * Verification does not touch source data. The store's name, description,
 * price, image and stock stay exactly as they arrived; confirming intelligence
 * is a statement about the derived layer only.
 */

export type VerifyResult =
  | { ok: true; verified: boolean }
  | { ok: false; error: string }

async function loadForVerification(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      organizationId: true,
      verificationStatus: true,
      intelligenceStatus: true,
      intelligenceStale: true,
      completenessScore: true,
      primaryClassification: true,
      targetConcerns: true,
      isActive: true,
    },
  })
}

export async function verifyProductIntelligenceAction(
  productId: string,
): Promise<VerifyResult> {
  const session = await requireAdmin()
  const product = await loadForVerification(productId)

  if (!product) {
    return { ok: false, error: "Product not found" }
  }

  // Verifying an extraction that has not happened would be confirming nothing.
  // A product still pending, mid-flight, or failed has no derived intelligence
  // for a person to have checked.
  if (product.intelligenceStatus === "pending" || product.intelligenceStatus === "extracting") {
    return { ok: false, error: "Nothing to verify yet — extraction has not completed." }
  }
  if (product.intelligenceStatus === "failed") {
    return { ok: false, error: "Extraction failed. Retry it before verifying." }
  }
  if (product.intelligenceStale) {
    return {
      ok: false,
      error: "The source changed since this was extracted. Re-extract before verifying.",
    }
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      verificationStatus: "confirmed",
      // The classification is the field the confidence band was introduced for,
      // and confirming the product confirms it too.
      classificationConfidence: "confirmed",
      lastVerifiedAt: new Date(),
    },
  })

  await recordAudit({
    action: "product.intelligence_verified",
    subjectType: "product",
    subjectId: product.id,
    actorId: session.user.id,
    actorRole: session.user.role ?? null,
    organizationId: product.organizationId,
    result: "success",
    metadata: {
      slug: product.slug,
      completenessScore: product.completenessScore,
      // Recorded because verification does not require it: a product can be
      // confirmed while still incomplete, and the record should say so rather
      // than implying every verified product was also finished.
      eligibleAtVerification: evaluateEligibility(product).eligible,
    },
  })

  revalidatePath("/admin/products")
  revalidateCatalogContext()

  return { ok: true, verified: true }
}

/**
 * Withdraws a confirmation.
 *
 * Present because verification is a claim a person made, and people are
 * sometimes wrong. Without this the only way to undo one would be a database
 * edit, which is not something an audit log can attribute to anybody.
 */
export async function revokeProductVerificationAction(
  productId: string,
): Promise<VerifyResult> {
  const session = await requireAdmin()
  const product = await loadForVerification(productId)

  if (!product) {
    return { ok: false, error: "Product not found" }
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      // Back to `imported`, not `unverified`: the extraction still happened.
      // Dropping to unverified would erase the record that anything ran.
      verificationStatus: "imported",
      classificationConfidence: product.primaryClassification ? "imported" : "unverified",
      lastVerifiedAt: null,
    },
  })

  await recordAudit({
    action: "product.intelligence_verification_revoked",
    subjectType: "product",
    subjectId: product.id,
    actorId: session.user.id,
    actorRole: session.user.role ?? null,
    organizationId: product.organizationId,
    result: "success",
    metadata: { slug: product.slug },
  })

  revalidatePath("/admin/products")
  revalidateCatalogContext()

  return { ok: true, verified: false }
}
