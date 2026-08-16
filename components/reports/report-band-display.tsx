import { BandBadge } from "@/components/scan/band-badge"
import { formatSkinHeadline } from "@/lib/scan/format"
import type { AssessmentBand, SkinDimension } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ReportBandDisplayProps = {
  band: AssessmentBand
  /** Passed so the headline can name the patterns behind the band. */
  dimensions?: SkinDimension[]
  size?: "sm" | "md"
  className?: string
}

export function ReportBandDisplay({
  band,
  dimensions,
  size = "md",
  className,
}: ReportBandDisplayProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <BandBadge band={band} size={size} variant="chip" />
      <p className="text-sm leading-relaxed text-muted-foreground">
        {formatSkinHeadline(band, dimensions)}
      </p>
    </div>
  )
}
