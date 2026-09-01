"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateTrainingRecordAction } from "@/lib/training/validation-actions"

const BANDS = ["minimal", "mild", "moderate", "elevated"] as const

export type ValidationCandidate = {
  id: string
  payload: {
    profile: {
      ageBand: string | null
      skinType: string | null
      fitzpatrickBand: string | null
      primaryConcerns: string[]
    }
    environment: { country: string | null; climateZone: string | null }
    assessment: { overallBand: string; dimensions: unknown }
    context: { captureMode: string; scanMonth: string; patientRating: number | null }
  }
}

export function ValidationQueue({
  candidates,
}: {
  candidates: ValidationCandidate[]
}) {
  if (candidates.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        Nothing waiting for review.
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {candidates.map((candidate) => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </div>
  )
}

function CandidateCard({ candidate }: { candidate: ValidationCandidate }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notes, setNotes] = useState("")
  const [correcting, setCorrecting] = useState(false)

  const { profile, environment, assessment, context } = candidate.payload

  function submit(
    verdict: "confirmed" | "corrected" | "rejected",
    correctedBand?: string,
  ) {
    startTransition(async () => {
      try {
        await validateTrainingRecordAction({
          recordId: candidate.id,
          verdict,
          correctedBand,
          notes: notes || undefined,
        })
        toast.success(
          verdict === "confirmed"
            ? "Marked correct"
            : verdict === "corrected"
              ? "Correction recorded"
              : "Excluded from training",
        )
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save")
      }
    })
  }

  return (
    <div className="surface-panel flex flex-col gap-4 rounded-xl border border-border/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">Model said</p>
        <Badge>{assessment.overallBand}</Badge>
        <span className="text-muted-foreground text-xs">
          {context.captureMode} · {context.scanMonth}
        </span>
      </div>

      {/*
        Everything shown here is already de-identified. There is no name, no
        photo and no exact location to show, by design — the reviewer judges the
        assessment against the recorded context, not against a person.
      */}
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 p-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Age range</dt>
          <dd>{profile.ageBand?.replace(/_/g, " ") ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Skin type</dt>
          <dd>{profile.skinType ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Fitzpatrick</dt>
          <dd>{profile.fitzpatrickBand ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Climate</dt>
          <dd>
            {environment.climateZone ?? "—"}
            {environment.country ? ` · ${environment.country}` : ""}
          </dd>
        </div>
      </dl>

      {profile.primaryConcerns.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {profile.primaryConcerns.map((concern) => (
            <Badge key={concern} variant="outline">
              {concern}
            </Badge>
          ))}
        </div>
      ) : null}

      <details>
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
          Dimension detail
        </summary>
        <pre className="bg-muted mt-2 overflow-x-auto rounded-lg p-3 text-xs">
          {JSON.stringify(assessment.dimensions, null, 2)}
        </pre>
      </details>

      <div className="space-y-2">
        <Label htmlFor={`notes-${candidate.id}`}>Notes (optional)</Label>
        <Textarea
          id={`notes-${candidate.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything a future reviewer should know"
        />
      </div>

      {correcting ? (
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-sm">What should it have been?</p>
          <div className="flex flex-wrap gap-2">
            {BANDS.filter((band) => band !== assessment.overallBand).map((band) => (
              <Button
                key={band}
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => submit("corrected", band)}
              >
                {band}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setCorrecting(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button size="sm" disabled={pending} onClick={() => submit("confirmed")}>
            Correct
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setCorrecting(true)}
          >
            Needs correction
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => submit("rejected")}
          >
            Unusable
          </Button>
        </div>
      )}
    </div>
  )
}
