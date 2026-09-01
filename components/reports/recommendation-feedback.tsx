"use client"

import { useState, useTransition } from "react"
import {
  IconCheck,
  IconMoodSad,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react"

import { submitRecommendationFeedback } from "@/lib/recommendation/feedback"
import { cn } from "@/lib/utils"

/**
 * What someone thought of one recommendation.
 *
 * Per product rather than per scan. "This scan was useful" cannot say which of
 * four products was the useful one, and that distinction is the only thing that
 * makes the feedback able to inform the weights.
 *
 * Four verdicts rather than a thumb, because the ways a recommendation misses
 * call for different fixes: wrong for me is a scoring problem, I already use
 * this is the engine agreeing with a choice already made, and it did not suit
 * me is about the product rather than the match.
 */

export type RecommendationVerdict =
  | "helpful"
  | "not_relevant"
  | "already_use"
  | "did_not_suit"

const OPTIONS: ReadonlyArray<{
  verdict: RecommendationVerdict
  label: string
  Icon: typeof IconThumbUp
}> = [
  { verdict: "helpful", label: "Helpful", Icon: IconThumbUp },
  { verdict: "already_use", label: "Already use it", Icon: IconCheck },
  { verdict: "not_relevant", label: "Not for me", Icon: IconThumbDown },
  { verdict: "did_not_suit", label: "Did not suit me", Icon: IconMoodSad },
]

type RecommendationFeedbackProps = {
  recommendationId: string
  initialVerdict?: RecommendationVerdict | null
}

export function RecommendationFeedback({
  recommendationId,
  initialVerdict = null,
}: RecommendationFeedbackProps) {
  const [verdict, setVerdict] = useState<RecommendationVerdict | null>(
    initialVerdict,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function choose(next: RecommendationVerdict) {
    // Optimistic, and reverted on failure. A verdict is a small, repeatable
    // act; making someone wait on a round trip to see their own tap register
    // costs more than the rare rollback does.
    const previous = verdict
    setVerdict(next)
    setError(null)

    startTransition(async () => {
      const result = await submitRecommendationFeedback({
        recommendationId,
        verdict: next,
      })

      if (!result.ok) {
        setVerdict(previous)
        setError("Could not save that just now.")
      }
    })
  }

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Was this useful?">
        {OPTIONS.map(({ verdict: value, label, Icon }) => {
          const selected = verdict === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              disabled={pending}
              aria-pressed={selected}
              title={label}
              className={cn(
                "inline-flex items-center gap-1 rounded-sm border px-1.5 py-1",
                "text-[0.65rem] font-medium transition-colors",
                "disabled:opacity-60",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <Icon className="size-3" aria-hidden />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
      {error ? (
        <p className="text-[0.65rem] text-destructive" role="status">
          {error}
        </p>
      ) : null}
    </div>
  )
}
