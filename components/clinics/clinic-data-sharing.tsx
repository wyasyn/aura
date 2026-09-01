"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { setClinicTrainingContributionAction } from "@/lib/training/consent-actions"

export function ClinicDataSharing({
  enabled,
  canManage,
  decidedAt,
}: {
  enabled: boolean
  canManage: boolean
  decidedAt: Date | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmingOff, setConfirmingOff] = useState(false)

  function set(next: boolean) {
    startTransition(async () => {
      try {
        const result = await setClinicTrainingContributionAction({ granted: next })
        toast.success(
          next
            ? "Contribution enabled"
            : result.withdrawn > 0
              ? `Turned off. ${result.withdrawn} record${result.withdrawn === 1 ? "" : "s"} withdrawn.`
              : "Turned off.",
        )
        setConfirmingOff(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save that")
      }
    })
  }

  return (
    <div className="surface-panel space-y-4 rounded-xl border border-border/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">Contribute to model improvement</p>
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Enabled" : "Off"}
        </Badge>
      </div>

      <div className="text-muted-foreground space-y-2 text-sm">
        <p>
          Allow your patients&apos; scan results to be considered for improving
          Aurora&apos;s analysis. Off unless you turn it on.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Your consent alone is not enough.</strong> Each patient must
            also opt in separately. Turning this on permits it; it does not
            decide for anyone.
          </li>
          <li>
            Photographs are never included, and are never stored in the first
            place.
          </li>
          <li>
            Names, emails and precise locations are removed before anything is
            reviewed or used.
          </li>
          <li>
            Turning this off withdraws every record already collected from your
            patients.
          </li>
        </ul>
      </div>

      {decidedAt ? (
        <p className="text-muted-foreground text-xs">
          Last changed{" "}
          {decidedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}.
        </p>
      ) : null}

      {!canManage ? (
        <p className="text-muted-foreground text-sm">
          Only clinic owners and admins can change this.
        </p>
      ) : enabled ? (
        confirmingOff ? (
          <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-4">
            <p className="text-sm">
              Turn off contribution? Records already collected from your
              patients will be withdrawn from the dataset.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => set(false)}
              >
                {pending ? "Withdrawing…" : "Yes, turn it off"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmingOff(false)}
              >
                Keep it on
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setConfirmingOff(true)}
          >
            Turn off
          </Button>
        )
      ) : (
        <Button disabled={pending} onClick={() => set(true)}>
          {pending ? "Saving…" : "Enable contribution"}
        </Button>
      )}
    </div>
  )
}
