import { ConsultationBookingButton } from "@/components/chat/consultation-booking-button"
import { cn } from "@/lib/utils"

type ChatMessageFooterProps = {
  consultationNote?: string | null
  className?: string
  /** Hidden when the surrounding view already shows a booking button. */
  showBookingButton?: boolean
}

export function ChatMessageFooter({
  consultationNote,
  className,
  showBookingButton = true,
}: ChatMessageFooterProps) {
  if (!consultationNote) {
    return null
  }

  return (
    <div
      className={cn(
        "space-y-2 border-t border-border/50 pt-2",
        className,
      )}
    >
      <p className="text-[11px] leading-snug text-muted-foreground">
        {consultationNote}
      </p>
      {showBookingButton ? <ConsultationBookingButton /> : null}
    </div>
  )
}
