import { ConsultationBookingButton } from "@/components/chat/consultation-booking-button"
import { SKIN_DISCLAIMER } from "@/lib/scan/constants"
import { cn } from "@/lib/utils"

type ReportDisclaimerProps = {
  className?: string
}

export function ReportDisclaimer({ className }: ReportDisclaimerProps) {
  return (
    <div className={cn("space-y-3 bg-muted/30 px-3 py-3", className)}>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {SKIN_DISCLAIMER}
      </p>
      <ConsultationBookingButton />
    </div>
  )
}
