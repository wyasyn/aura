import { Button } from "@/components/ui/button"
import { CONSULTATION_BOOKING_URL } from "@/lib/scan/constants"
import { cn } from "@/lib/utils"

type ConsultationBookingButtonProps = {
  className?: string
}

export function ConsultationBookingButton({
  className,
}: ConsultationBookingButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn("h-8 w-fit text-xs", className)}
    >
      <a
        href={CONSULTATION_BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Book a consultation
      </a>
    </Button>
  )
}
