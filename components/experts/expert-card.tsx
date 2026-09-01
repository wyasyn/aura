import Link from "next/link"
import { IconStarFilled } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { SPECIALTY_LABELS } from "@/lib/experts/types"
import { formatMoneyCents } from "@/lib/payments/format"

export type ExpertCardData = {
  id: string
  specialty: keyof typeof SPECIALTY_LABELS
  headline: string
  yearsExperience: number
  consultationPriceCents: number
  avgRating: number | null
  reviewCount: number
  user: { name: string }
}

export function ExpertCard({ expert }: { expert: ExpertCardData }) {
  return (
    <Link
      href={`/experts/${expert.id}`}
      className="surface-panel flex flex-col gap-3 rounded-xl border border-border/60 p-5 transition-colors hover:border-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-base font-medium">{expert.user.name}</p>
          <p className="text-sm text-muted-foreground">{expert.headline}</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {SPECIALTY_LABELS[expert.specialty]}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          {expert.avgRating ? (
            <>
              <IconStarFilled className="size-3.5 text-primary" />
              <span className="font-medium text-foreground">
                {expert.avgRating.toFixed(1)}
              </span>
              <span>({expert.reviewCount})</span>
            </>
          ) : (
            <span>New</span>
          )}
          <span>· {expert.yearsExperience} yrs</span>
        </div>
        <p className="font-heading font-medium tabular-nums">
          {formatMoneyCents(expert.consultationPriceCents, "USD")}
        </p>
      </div>
    </Link>
  )
}
