import { BandBadge } from "@/components/scan/band-badge"
import type { AssessmentBand, SkinDimension } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ReportDimensionTableProps = {
  dimensions: SkinDimension[]
  className?: string
}

export function ReportDimensionTable({
  dimensions,
  className,
}: ReportDimensionTableProps) {
  if (dimensions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No dimension data available.</p>
    )
  }

  return (
    <div className={cn("grid gap-3 font-sans sm:grid-cols-2", className)}>
      {dimensions.map((dimension) => (
        <div
          key={dimension.id}
          className="space-y-1 rounded-sm bg-muted/20 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {dimension.label}
            </p>
            <BandBadge
              band={dimension.band as AssessmentBand}
              size="sm"
              variant="chip"
            />
          </div>
          {dimension.note ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {dimension.note}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
