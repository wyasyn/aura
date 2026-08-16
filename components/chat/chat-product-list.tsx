import { IconExternalLink } from "@tabler/icons-react"
import Image from "next/image"

import { RecommendationSectionHeader } from "@/components/recommendations/recommendation-section-header"
import { ReportApplicationSchedule } from "@/components/reports/report-application-schedule"
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/products/placeholder"
import { RECOMMENDATION_SECTIONS } from "@/lib/scan/constants"
import type { ProductRecommendation } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ChatProductListProps = {
  products: ProductRecommendation[]
  className?: string
}

export function ChatProductList({ products, className }: ChatProductListProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <div className={cn("min-w-0 space-y-2 border-t border-border/60 pt-3", className)}>
      <RecommendationSectionHeader
        title={RECOMMENDATION_SECTIONS.recommendedProducts.title}
      />
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => {
          const imageSrc = product.imageUrl?.trim()
            ? product.imageUrl
            : PRODUCT_IMAGE_PLACEHOLDER
          const href = product.storeUrl?.trim() || null

          const card = (
            <>
              <div className="relative aspect-4/5 w-full overflow-hidden bg-muted/40">
                <Image
                  src={imageSrc}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 50vw, 160px"
                />
              </div>
              <div className="min-w-0 space-y-1.5 p-2.5">
                <p className="text-xs font-medium text-foreground">
                  {product.name}
                </p>
                <ReportApplicationSchedule
                  applicationTime={product.applicationTime}
                  applicationFrequency={product.applicationFrequency}
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {product.reason}
                </p>
                {href ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    View product
                    <IconExternalLink className="size-3" />
                  </span>
                ) : null}
              </div>
            </>
          )

          if (!href) {
            return (
              <article
                key={product.id}
                className="min-w-0 overflow-hidden rounded-sm border border-border bg-background/60"
              >
                {card}
              </article>
            )
          }

          return (
            <a
              key={product.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block min-w-0 overflow-hidden rounded-sm border border-border bg-background/60 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              {card}
            </a>
          )
        })}
      </div>
    </div>
  )
}
