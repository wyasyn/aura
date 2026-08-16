import type { MouseEvent, ReactNode } from "react"
import { IconExternalLink } from "@tabler/icons-react"

import { ProductImageFrame } from "@/components/products/product-image-frame"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ProductCardProps = {
  name: string
  subtitle?: string
  description?: string
  imageUrl?: string | null
  storeUrl?: string | null
  showStoreLink?: boolean
  badge?: ReactNode
  selected?: boolean
  onClick?: () => void
  imageAspect?: "portrait" | "square"
  className?: string
}

export function ProductCard({
  name,
  subtitle,
  description,
  imageUrl,
  storeUrl,
  showStoreLink = true,
  badge,
  selected = false,
  onClick,
  imageAspect = "square",
  className,
}: ProductCardProps) {
  const interactive = Boolean(onClick)
  const hasStoreLink = Boolean(showStoreLink && storeUrl)

  function stopLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
  }

  const card = (
    <Card
      size="sm"
      className={cn(
        "h-full overflow-hidden rounded-[1.5rem] border-none py-0 shadow-none outline-none transition-[transform,box-shadow,background-color] motion-safe:duration-200",
        (interactive || hasStoreLink) && "cursor-pointer",
        interactive && "hover:bg-muted/20",
        hasStoreLink &&
          "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md",
        selected && "ring-2 ring-primary",
        className,
      )}
    >
      <div className="p-3 pb-0">
        <ProductImageFrame
          src={imageUrl}
          alt={name}
          aspect={imageAspect}
        />
      </div>
      <CardHeader className="gap-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium normal-case tracking-normal text-foreground">
            {name}
          </CardTitle>
          {badge}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground text-xs capitalize">{subtitle}</p>
        ) : null}
      </CardHeader>
      {description ? (
        <CardContent className="pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </CardContent>
      ) : null}
      {hasStoreLink ? (
        <CardContent className={cn("pt-0", description ? "pb-4" : "pb-4")}>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full rounded-full"
          >
            <a
              href={storeUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopLinkClick}
            >
              View on Aurora Organics
              <IconExternalLink className="size-3.5" />
            </a>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )

  if (!interactive) {
    return card
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full cursor-pointer text-left"
    >
      {card}
    </button>
  )
}
