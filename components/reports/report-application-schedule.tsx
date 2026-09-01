import { formatApplicationSchedule } from "@/lib/scan/format"
import type { ApplicationFrequency, ApplicationTime } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ReportApplicationScheduleProps = {
  applicationTime?: ApplicationTime
  applicationFrequency?: ApplicationFrequency
  className?: string
}

export function ReportApplicationSchedule({
  applicationTime,
  applicationFrequency,
  className,
}: ReportApplicationScheduleProps) {
  const label = formatApplicationSchedule(
    applicationTime,
    applicationFrequency,
  )

  if (!label) {
    return null
  }

  return (
    <span
      className={cn(
        "inline-block rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  )
}
