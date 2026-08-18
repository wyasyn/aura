"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconStar, IconStarFilled } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { Textarea } from "@/components/ui/textarea"
import { submitExpertReviewAction } from "@/lib/experts/review-actions"

export function LeaveReviewDialog({
  bookingId,
  expertName,
  open,
  onOpenChange,
}: {
  bookingId: string
  expertName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await submitExpertReviewAction({ bookingId, rating, comment })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success("Review submitted")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Review ${expertName}`}
      className="sm:max-w-md"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1
            const Icon = value <= rating ? IconStarFilled : IconStar
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
              >
                <Icon className="size-6 text-primary" />
              </button>
            )
          })}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was your consultation? (optional)"
          rows={4}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
