"use client"

import { useState } from "react"

import { LeaveReviewDialog } from "@/components/experts/leave-review-dialog"
import { VideoCallDialog } from "@/components/experts/video-call-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatSlotLabel } from "@/lib/experts/format"
import { formatMoneyCents } from "@/lib/payments/format"

export type MyBookingRow = {
  id: string
  status: "confirmed" | "completed"
  amountCents: number
  currency: string
  videoRoomUrl: string | null
  joinable: boolean
  expert: { user: { name: string } }
  slot: { startTime: string | Date; endTime: string | Date }
  review: { id: string } | null
}

export function MyAppointments({ bookings }: { bookings: MyBookingRow[] }) {
  const [callUrl, setCallUrl] = useState<string | null>(null)
  const [callOpen, setCallOpen] = useState(false)
  const [reviewBooking, setReviewBooking] = useState<MyBookingRow | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  if (bookings.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        No appointments yet. Browse experts to book a consultation.
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
                <p className="font-medium">{booking.expert.user.name}</p>
                <Badge variant={booking.status === "completed" ? "secondary" : "default"}>
                  {booking.status === "completed" ? "Completed" : "Confirmed"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatSlotLabel(booking.slot.startTime, booking.slot.endTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatMoneyCents(booking.amountCents, booking.currency)}
              </p>
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
              {booking.status === "completed" && !booking.review ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReviewBooking(booking)
                    setReviewOpen(true)
                  }}
                >
                  Leave a review
                </Button>
              ) : null}
              {booking.status === "completed" && booking.review ? (
                <span className="text-xs text-muted-foreground">Reviewed</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <VideoCallDialog roomUrl={callUrl} open={callOpen} onOpenChange={setCallOpen} />
      {reviewBooking ? (
        <LeaveReviewDialog
          bookingId={reviewBooking.id}
          expertName={reviewBooking.expert.user.name}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
        />
      ) : null}
    </>
  )
}
