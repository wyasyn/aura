"use client"

import { useState } from "react"
import { IconLoader2, IconStar, IconStarFilled } from "@tabler/icons-react"

import { FeedbackSuccessTick } from "@/components/scan/feedback-success-tick"
import { FeedbackWidget } from "@/components/motion/feedback-widget"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitScanFeedbackAction } from "@/lib/scan/submit-feedback-action"
import { cn } from "@/lib/utils"

export type ScanFeedbackRecord = {
  rating: number
  message: string | null
}

type ScanFeedbackWidgetProps = {
  scanId: string
  existingFeedback?: ScanFeedbackRecord | null
  position?: "bottom-right" | "bottom-left"
  /** When true, skip viewport-corner positioning — parent controls placement. */
  anchored?: boolean
  className?: string
}

type ScanFeedbackFormProps = {
  scanId: string
  existingFeedback?: ScanFeedbackRecord | null
  onSubmitted?: () => void
  className?: string
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Rate your scan from 1 to 5 stars"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1
        const filled = star <= value
        const Icon = filled ? IconStarFilled : IconStar
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            disabled={disabled}
            onClick={() => onChange(star)}
            className={cn(
              "grid size-8 place-items-center rounded-full transition-colors",
              filled ? "text-primary" : "text-muted-foreground",
              !disabled && "hover:bg-muted/60",
            )}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </div>
  )
}

export function ScanFeedbackForm({
  scanId,
  existingFeedback = null,
  onSubmitted,
  className,
}: ScanFeedbackFormProps) {
  const [rating, setRating] = useState(existingFeedback?.rating ?? 0)
  const [message, setMessage] = useState(existingFeedback?.message ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(existingFeedback != null)

  async function handleSubmit() {
    if (rating === 0 || submitting || submitted) return

    setSubmitting(true)
    setError(null)
    try {
      const result = await submitScanFeedbackAction({
        scanId,
        rating,
        message: message.trim() || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSubmitted(true)
      onSubmitted?.()
    } catch {
      setError("Could not send feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={cn("flex justify-center py-2", className)}>
        <FeedbackSuccessTick size="md" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Rate your experience</p>
        <StarRating value={rating} onChange={setRating} disabled={submitting} />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="scan-feedback-message"
          className="text-sm font-medium text-foreground"
        >
          Comments (optional)
        </label>
        <Textarea
          id="scan-feedback-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Optional comments about your results…"
          rows={4}
          disabled={submitting}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        size="sm"
        disabled={rating === 0 || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? (
          <IconLoader2 className="size-3.5 animate-spin" />
        ) : null}
        {submitting ? "Sending…" : "Submit feedback"}
      </Button>
    </div>
  )
}

export function ScanFeedbackWidget({
  scanId,
  existingFeedback = null,
  position = "bottom-right",
  anchored = false,
  className,
}: ScanFeedbackWidgetProps) {
  const [rating, setRating] = useState(existingFeedback?.rating ?? 0)
  const [submitted, setSubmitted] = useState(existingFeedback != null)

  if (submitted) {
    return (
      <div
        className={cn(
          "pointer-events-none z-30 flex items-center justify-center",
          anchored
            ? "relative size-12"
            : cn(
                "absolute bottom-4",
                position === "bottom-left" ? "left-4" : "right-4",
              ),
          className,
        )}
      >
        <FeedbackSuccessTick size={anchored ? "lg" : "md"} />
      </div>
    )
  }

  return (
    <FeedbackWidget
      position={position}
      anchored={anchored}
      className={className}
      title="How was your scan?"
      placeholder="Optional comments about your results…"
      requireMessage={false}
      submitDisabled={rating === 0}
      headerContent={
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Rate your experience</p>
          <StarRating value={rating} onChange={setRating} />
        </div>
      }
      onSubmit={async ({ message }) => {
        const result = await submitScanFeedbackAction({
          scanId,
          rating,
          message: message.trim() || undefined,
        })
        if (!result.ok) {
          throw new Error(result.error)
        }
        setSubmitted(true)
      }}
    />
  )
}
