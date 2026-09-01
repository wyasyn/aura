import { IconExternalLink } from "@tabler/icons-react"
import Image from "next/image"

import { RecommendationFeedback } from "@/components/reports/recommendation-feedback"
import { ReportApplicationSchedule } from "@/components/reports/report-application-schedule"
import type { RecommendationFeedbackState } from "@/lib/recommendation/feedback-queries"
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/products/placeholder"
import type { ProductRecommendation } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ReportProductListProps = {
  products: ProductRecommendation[]
  className?: string
  /**
   * The clinic whose site this report is being read on, used to name the
   * source of its own products. Absent on the platform, where every
   * recommendation is Aurora's.
   */
  clinicName?: string | null
  /**
   * The stored recommendation row per product slug, when one exists.
   *
   * Absent for scans taken before the engine, which have nothing to attach a
   * verdict to. Those render without the controls rather than with dead ones.
   */
  feedback?: Map<string, RecommendationFeedbackState> | null
}

/**
 * Where a recommended product came from.
 *
 * A patient seeing "Recommended by Wellderm" is being told their clinic chose
 * this, which is different from Aurora suggesting it — so the two are always
 * distinguishable. The source is a plain flag resolved on the server; the
 * organization id never reaches the client.
 *
 * Silent on older recommendations, which predate source attribution and carry
 * no flag. Guessing a source for them would be worse than omitting it.
 */
function ProductSource({
  source,
  clinicName,
}: {
  source: ProductRecommendation["source"]
  clinicName?: string | null
}) {
  if (!source) return null

  return (
    <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
      {source === "clinic"
        ? `Recommended by ${clinicName?.trim() || "your clinic"}`
        : "Aurora Catalogue"}
    </p>
  )
}

export function ReportProductList({
  products,
  className,
  clinicName,
  feedback = null,
}: ReportProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No product recommendations for this scan.
      </p>
    )
  }

  return (
    <div className={cn("grid gap-4 font-sans sm:grid-cols-2 md:grid-cols-3", className)}>
      {products.map((product) => {
        const imageSrc = product.imageUrl?.trim()
          ? product.imageUrl
          : PRODUCT_IMAGE_PLACEHOLDER

        return (
          <article
            key={product.id}
            className="overflow-hidden rounded-sm border border-border bg-muted/20"
          >
            <div className="relative aspect-4/5 w-full overflow-hidden bg-muted/40">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="space-y-2 p-3">
              <p className="text-sm font-medium text-foreground">
                {product.name}
              </p>
              <ProductSource source={product.source} clinicName={clinicName} />
              <ReportApplicationSchedule
                applicationTime={product.applicationTime}
                applicationFrequency={product.applicationFrequency}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {product.reason}
              </p>
              {feedback?.get(product.id) ? (
                <RecommendationFeedback
                  recommendationId={feedback.get(product.id)!.recommendationId}
                  initialVerdict={feedback.get(product.id)!.verdict}
                />
              ) : null}
              {product.storeUrl ? (
                <a
                  href={product.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View on Aurora Organics
                  <IconExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
