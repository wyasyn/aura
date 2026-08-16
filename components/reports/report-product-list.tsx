import { IconExternalLink } from "@tabler/icons-react"
import Image from "next/image"

import { ReportApplicationSchedule } from "@/components/reports/report-application-schedule"
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/products/placeholder"
import type { ProductRecommendation } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ReportProductListProps = {
  products: ProductRecommendation[]
  className?: string
}

export function ReportProductList({
  products,
  className,
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
              <ReportApplicationSchedule
                applicationTime={product.applicationTime}
                applicationFrequency={product.applicationFrequency}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {product.reason}
              </p>
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
