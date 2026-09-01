"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { setTrainingConsentAction } from "@/lib/training/consent-actions"

export function TrainingConsentCard({
  granted,
  decidedAt,
}: {
  granted: boolean
  decidedAt: Date | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)

  function set(next: boolean) {
    startTransition(async () => {
      try {
        const result = await setTrainingConsentAction({ granted: next })
        toast.success(
          next
            ? "Thank you — your scans can now help improve Aurora."
            : result.withdrawn > 0
              ? `Consent withdrawn. ${result.withdrawn} record${result.withdrawn === 1 ? "" : "s"} removed from the dataset.`
              : "Consent withdrawn.",
        )
        setConfirmingRevoke(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save that")
      }
    })
  }

  return (
    <div className="surface-panel space-y-4 rounded-xl border border-border/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">Help improve Aurora</p>
        <Badge variant={granted ? "default" : "secondary"}>
          {granted ? "Sharing" : "Not sharing"}
        </Badge>
      </div>

      <div className="text-muted-foreground space-y-2 text-sm">
        <p>
          You can let your past scan results help improve the analysis for
          everyone. This is separate from letting us analyse a scan, and it is
          off unless you turn it on.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Your photos are never included.</strong> They are still
            never stored.
          </li>
          <li>
            Your name, email, and exact location are removed. Only your country
            and broad details like age range and skin type are kept.
          </li>
          <li>
            A qualified dermatologist reviews every example before it is used.
          </li>
          <li>
            You can change your mind at any time, and anything already collected
            is removed.
          </li>
        </ul>
      </div>

      {decidedAt ? (
        <p className="text-muted-foreground text-xs">
          Last updated{" "}
          {decidedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}.
        </p>
      ) : null}

      {granted ? (
        confirmingRevoke ? (
          <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-4">
            <p className="text-sm">
              Stop sharing? Anything already collected from your scans will be
              removed from the dataset.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => set(false)}
              >
                {pending ? "Withdrawing…" : "Yes, stop sharing"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmingRevoke(false)}
              >
                Keep sharing
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setConfirmingRevoke(true)}
          >
            Stop sharing
          </Button>
        )
      ) : (
        <Button disabled={pending} onClick={() => set(true)}>
          {pending ? "Saving…" : "Share my scan results"}
        </Button>
      )}
    </div>
  )
}
