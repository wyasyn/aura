"use client"

import { useMemo, useState, useTransition } from "react"
import { IconMinus, IconPlus, IconRotate } from "@tabler/icons-react"

import {
  resetClinicRecommendationWeights,
  saveClinicRecommendationWeights,
  type ClinicWeightsState,
} from "@/lib/clinics/recommendation-weight-actions"
import { WEIGHT_AXIS_COPY, WEIGHT_BOUNDS } from "@/lib/recommendation/weight-copy"
import type { ScoringWeights } from "@/lib/recommendation/weights"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * How this clinic's recommendations are scored.
 *
 * The weights are independent multipliers, not shares of a fixed budget, so
 * there is no total to reach and none is shown. Presenting a "Total: 100" here
 * would be a fiction the engine does not honour — raising every weight by the
 * same factor changes nothing about the ranking, and raising one changes its
 * influence relative to the rest without needing to take anything from them.
 * What is shown instead is each axis's share of the score a perfect match could
 * earn, which is the thing that actually moves when a number changes.
 */

type RecommendationWeightsFormProps = {
  initial: ClinicWeightsState
}

function clamp(key: keyof ScoringWeights, value: number): number {
  const { min, max } = WEIGHT_BOUNDS[key]
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function RecommendationWeightsForm({ initial }: RecommendationWeightsFormProps) {
  const [saved, setSaved] = useState<ScoringWeights>(initial.weights)
  const [draft, setDraft] = useState<ScoringWeights>(initial.weights)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Tracked here rather than read from `initial` on every render: `initial` is
  // the server's answer from page load, so after a save or a reset it describes
  // the configuration that was replaced. Leaving it would tell somebody who had
  // just restored the defaults that they were still using their own weights.
  const [customised, setCustomised] = useState(initial.customised)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  )

  // The additive axes only. The two multipliers scale whatever the axes earn,
  // so including them in a share-of-total would compare unlike things.
  const axisTotal = useMemo(
    () =>
      WEIGHT_AXIS_COPY.filter((axis) => axis.kind === "axis").reduce(
        (sum, axis) => sum + draft[axis.key],
        0,
      ),
    [draft],
  )

  function set(key: keyof ScoringWeights, value: number) {
    setError(null)
    setNotice(null)
    setDraft((current) => ({ ...current, [key]: clamp(key, value) }))
  }

  function save() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await saveClinicRecommendationWeights(draft)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(result.weights)
      setDraft(result.weights)
      setCustomised(
        JSON.stringify(result.weights) !== JSON.stringify(initial.defaults),
      )
      setNotice("Saved. New scans will use these weights.")
    })
  }

  function reset() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await resetClinicRecommendationWeights()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(result.weights)
      setDraft(result.weights)
      setCustomised(false)
      setNotice("Restored Aurora's defaults.")
    })
  }

  const readOnly = !initial.canConfigure

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Configure how Aurora scores eligible products for your patients.
            Safety filtering, product eligibility and allergy exclusions are not
            configurable and are applied before any of this.
          </p>
          <p className="text-xs text-muted-foreground">
            {customised
              ? "This clinic uses its own weights."
              : "This clinic uses Aurora's defaults."}
            {" "}Scoring version {initial.version}.
          </p>
        </div>
        {dirty ? (
          <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[0.65rem] font-medium text-amber-600">
            Unsaved changes
          </span>
        ) : null}
      </div>

      {readOnly ? (
        <p className="rounded-sm border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          You can see this configuration but not change it. Clinic owners and
          administrators can.
        </p>
      ) : null}

      <div className="space-y-4">
        {WEIGHT_AXIS_COPY.map((axis) => {
          const bounds = WEIGHT_BOUNDS[axis.key]
          const value = draft[axis.key]
          const share =
            axis.kind === "axis" && axisTotal > 0
              ? Math.round((value / axisTotal) * 100)
              : null

          return (
            <div
              key={axis.key}
              className="space-y-2 rounded-sm border border-border p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{axis.label}</p>
                  <p className="font-mono text-[0.65rem] text-muted-foreground">
                    {axis.key}
                  </p>
                </div>
                {share !== null ? (
                  <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                    {share}% of a perfect match
                  </span>
                ) : (
                  <span className="text-[0.65rem] text-muted-foreground">
                    multiplier
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {axis.description}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7"
                  disabled={readOnly || pending || value <= bounds.min}
                  aria-label={`Decrease ${axis.label}`}
                  onClick={() => set(axis.key, Number((value - bounds.step).toFixed(2)))}
                >
                  <IconMinus className="size-3" aria-hidden />
                </Button>

                <input
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={value}
                  disabled={readOnly || pending}
                  aria-label={axis.label}
                  onChange={(event) => set(axis.key, Number(event.target.value))}
                  className="h-1 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed"
                />

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7"
                  disabled={readOnly || pending || value >= bounds.max}
                  aria-label={`Increase ${axis.label}`}
                  onClick={() => set(axis.key, Number((value + bounds.step).toFixed(2)))}
                >
                  <IconPlus className="size-3" aria-hidden />
                </Button>

                <Input
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={value}
                  disabled={readOnly || pending}
                  aria-label={`${axis.label} value`}
                  onChange={(event) => set(axis.key, Number(event.target.value))}
                  className="h-8 w-20 text-xs tabular-nums"
                />

                <span
                  className={cn(
                    "w-14 text-right text-[0.65rem] tabular-nums",
                    value === initial.defaults[axis.key]
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground",
                  )}
                >
                  {value === initial.defaults[axis.key]
                    ? "default"
                    : `was ${initial.defaults[axis.key]}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {error ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="button" size="sm" onClick={save} disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(saved)
              setError(null)
              setNotice(null)
            }}
            disabled={pending || !dirty}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={pending}
          >
            <IconRotate className="size-3.5" aria-hidden />
            Reset to Aurora defaults
          </Button>
        </div>
      ) : null}
    </div>
  )
}
