"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { VideoCallDialog } from "@/components/experts/video-call-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { markBookingCompletedAction } from "@/lib/experts/expert-booking-actions"
import { formatSlotLabel } from "@/lib/experts/format"

export type ExpertBookingRow = {
  id: string
  status: "confirmed" | "completed"
  videoRoomUrl: string | null
  joinable: boolean
  started: boolean
  user: { name: string; email: string }
  slot: { startTime: string | Date; endTime: string | Date }
}

export function ExpertBookings({ bookings }: { bookings: ExpertBookingRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [callUrl, setCallUrl] = useState<string | null>(null)
  const [callOpen, setCallOpen] = useState(false)

  function complete(id: string) {
    startTransition(async () => {
      const result = await markBookingCompletedAction(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Marked completed")
      router.refresh()
    })
  }

  if (bookings.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        No bookings yet.
      </p>
    )
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-xl border border-border/60">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{booking.user.name}</p>
                <Badge variant={booking.status === "completed" ? "secondary" : "default"}>
                  {booking.status === "completed" ? "Completed" : "Confirmed"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatSlotLabel(booking.slot.startTime, booking.slot.endTime)}
              </p>
              <p className="text-xs text-muted-foreground">{booking.user.email}</p>
            </div>
            <div className="flex gap-2">
              {booking.status === "confirmed" && booking.joinable && booking.videoRoomUrl ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setCallUrl(booking.videoRoomUrl)
                    setCallOpen(true)
                  }}
                >
                  Join call
                </Button>
              ) : null}
              {booking.status === "confirmed" && booking.started ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => complete(booking.id)}
                >
                  Mark completed
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <VideoCallDialog roomUrl={callUrl} open={callOpen} onOpenChange={setCallOpen} />
    </>
  )
}
