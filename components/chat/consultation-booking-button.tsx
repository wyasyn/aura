import Link from "next/link"

import { Button } from "@/components/ui/button"
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
      <Link href="/experts">Book a consultation</Link>
    </Button>
  )
}
