"use client"

import { useState } from "react"
import { IconStarFilled } from "@tabler/icons-react"

import {
  BookingCheckoutDialog,
  type BookableSlot,
} from "@/components/experts/booking-checkout-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatSlotLabel } from "@/lib/experts/format"
import { SPECIALTY_LABELS } from "@/lib/experts/types"
import { formatMoneyCents } from "@/lib/payments/format"

export type ExpertProfileData = {
  id: string
  specialty: keyof typeof SPECIALTY_LABELS
  headline: string
  bio: string
  yearsExperience: number
  consultationPriceCents: number
  avgRating: number | null
  reviewCount: number
  user: { name: string }
  reviews: {
    id: string
    rating: number
    comment: string | null
    createdAt: string | Date
    user: { name: string }
  }[]
}

export function ExpertProfileView({
  expert,
  openSlots,
  hasBillingProfile,
  isSimulated,
  currency,
}: {
  expert: ExpertProfileData
  openSlots: { id: string; startTime: string | Date; endTime: string | Date }[]
  hasBillingProfile: boolean
  isSimulated: boolean
  currency: string
}) {
  const [selected, setSelected] = useState<BookableSlot | null>(null)
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)

  function onPick(slot: (typeof openSlots)[number]) {
    setSelected({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: formatSlotLabel(slot.startTime, slot.endTime),
    })
    setSession((c) => c + 1)
    setOpen(true)
  }

  return (
    <div className="space-y-8">
      <div className="surface-panel space-y-4 rounded-xl border border-border/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-medium">
                {expert.user.name}
              </h1>
              <Badge variant="outline">{SPECIALTY_LABELS[expert.specialty]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{expert.headline}</p>
          </div>
          <p className="font-heading text-2xl font-medium tabular-nums">
            {formatMoneyCents(expert.consultationPriceCents, currency)}
          </p>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {expert.avgRating ? (
            <>
              <IconStarFilled className="size-4 text-primary" />
              <span className="font-medium text-foreground">
                {expert.avgRating.toFixed(1)}
              </span>
              <span>({expert.reviewCount} reviews)</span>
            </>
          ) : (
            <span>No reviews yet</span>
          )}
          <span>· {expert.yearsExperience} years experience</span>
        </div>

        <p className="text-sm leading-relaxed">{expert.bio}</p>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Available times</h2>
        {openSlots.length === 0 ? (
          <p className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
            No open times right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {openSlots.map((slot) => (
              <Button
                key={slot.id}
                variant="outline"
                className="justify-between"
                onClick={() => onPick(slot)}
              >
                {formatSlotLabel(slot.startTime, slot.endTime)}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Reviews</h2>
        {expert.reviews.length === 0 ? (
          <p className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
            No reviews yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {expert.reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-border/60 p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <IconStarFilled
                        key={i}
                        className={
                          i < review.rating
                            ? "size-3.5 text-primary"
                            : "size-3.5 text-muted-foreground/30"
                        }
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium">{review.user.name}</p>
                </div>
                {review.comment ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <BookingCheckoutDialog
        key={session}
        expertName={expert.user.name}
        priceCents={expert.consultationPriceCents}
        currency={currency}
        hasBillingProfile={hasBillingProfile}
        isSimulated={isSimulated}
        slot={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
