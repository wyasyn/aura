import Image from "next/image"

import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/products/placeholder"
import { cn } from "@/lib/utils"

type ProductImageFrameProps = {
  src?: string | null
  alt: string
  aspect?: "portrait" | "square"
  priority?: boolean
  className?: string
}

export function ProductImageFrame({
  src,
  alt,
  aspect = "portrait",
  priority = false,
  className,
}: ProductImageFrameProps) {
  const imageSrc = src?.trim() ? src : PRODUCT_IMAGE_PLACEHOLDER

  return (
    <div
      className={cn(
        "border-border bg-muted/40 relative overflow-hidden rounded-2xl ",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          aspect === "portrait" ? "aspect-[4/5]" : "aspect-square",
        )}
      >
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes={
            aspect === "portrait"
              ? "(max-width: 640px) 100vw, 280px"
              : "(max-width: 640px) 50vw, 240px"
          }
          priority={priority}
        />
      </div>
    </div>
  )
}
