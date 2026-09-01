"use client"

import { useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconCheck,
  IconCrop,
  IconLoader2,
  IconRefresh,
  IconUpload,
} from "@tabler/icons-react"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import { ScanPhotoFrame } from "@/components/scan/scan-photo-frame"
import { ScanStepFrame } from "@/components/scan/scan-step-frame"
import { ScanStepShell } from "@/components/scan/scan-step-shell"
import { Button } from "@/components/ui/button"
import { runQualityGate } from "@/lib/scan/quality-gate"
import type { CaptureMode, QualityCheckResult } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ScanQualityStepProps = {
  imageSrc: string
  captureSource: CaptureMode
  onPass: () => void
  onReEdit: () => void
  onRetake: () => void
}

export function ScanQualityStep({
  imageSrc,
  captureSource,
  onPass,
  onReEdit,
  onRetake,
}: ScanQualityStepProps) {
  const fromCamera = captureSource === "camera"
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<QualityCheckResult | null>(null)
  const [resolutionWarning, setResolutionWarning] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      setLoading(true)
      try {
        const image = await loadImage(imageSrc)
        const shortEdge = Math.min(image.naturalWidth, image.naturalHeight)
        if (!cancelled) {
          setResolutionWarning(
            shortEdge < 1024
              ? `Photo resolution is ${image.naturalWidth}×${image.naturalHeight}. For best results, use a larger crop or a higher-resolution camera.`
              : null,
          )
        }
        const quality = await runQualityGate(image, { trustUserCrop: true })
        if (!cancelled) setResult(quality)
      } catch {
        if (!cancelled) {
          setResult({
            faceDetected: false,
            faceCount: 0,
            faceCentered: false,
            lightingScore: 0,
            lightingBand: "too_dark",
            skinCoverage: 0,
            skinDetail: 0,
            cropSubject: "none",
            isPlausibleSkin: false,
            issues: [
              "Face detection failed for this photo. Try better lighting, a larger crop, or retake.",
            ],
            passed: false,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [imageSrc])

  const checks = [
    {
      id: "crop",
      label: result?.cropSubject === "skin" ? "Skin close-up" : "Face in crop",
      hint:
        result?.cropSubject === "skin"
          ? "The crop is filled with skin, no face needed"
          : "A single face, or a close-up of skin, fills the crop",
      status: loading
        ? ("loading" as const)
        : result && result.cropSubject !== "none"
          ? ("success" as const)
          : ("danger" as const),
    },
    {
      id: "lighting",
      label: "Lighting",
      hint: "Even light, no blowouts or deep shadow",
      status: loading
        ? ("loading" as const)
        : result?.lightingBand === "ok"
          ? ("success" as const)
          : ("warning" as const),
    },
    {
      id: "skin",
      label: "Skin detail",
      hint: "Enough texture for a reliable read",
      status: loading
        ? ("loading" as const)
        : result?.isPlausibleSkin
          ? ("success" as const)
          : ("warning" as const),
    },
  ]

  const notes = [
    ...(resolutionWarning ? [resolutionWarning] : []),
    ...(result?.issues ?? []),
  ]

  return (
    <ScanStepFrame>
      <ScanStepShell
        step="quality"
        title="Checking photo quality"
        description="We verify the crop and lighting before analyzing your skin"
      >
        <ScanPhotoFrame src={imageSrc} alt="Photo preview">
          {loading ? (
            <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[2px]">
              <AnimatedBadge status="loading" size="sm">
                Running checks…
              </AnimatedBadge>
            </div>
          ) : null}
        </ScanPhotoFrame>

        <ul className="grid gap-1.5 sm:grid-cols-3">
          {checks.map((check) => (
            <li
              key={check.id}
              className={cn(
                "flex items-start gap-2 rounded-2xl border p-2.5 transition-colors duration-300",
                check.status === "success"
                  ? "border-emerald-500/25 bg-emerald-500/5"
                  : check.status === "danger"
                    ? "border-destructive/25 bg-destructive/5"
                    : check.status === "warning"
                      ? "border-amber-500/25 bg-amber-500/5"
                      : "border-border/70 bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "mt-px grid size-5 shrink-0 place-items-center rounded-full",
                  check.status === "success"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : check.status === "danger"
                      ? "bg-destructive/15 text-destructive"
                      : check.status === "warning"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {check.status === "loading" ? (
                  <IconLoader2 className="size-3 animate-spin" aria-hidden />
                ) : check.status === "success" ? (
                  <IconCheck className="size-3" aria-hidden />
                ) : (
                  <IconAlertTriangle className="size-3" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold leading-none text-foreground">
                  {check.label}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                  {check.hint}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {!loading && notes.length ? (
          <ul className="space-y-1.5 rounded-2xl border border-border/70 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
            {notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                {note}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReEdit}
            className="rounded-full"
          >
            <IconCrop className="size-3.5" />
            Adjust crop
          </Button>
          <Button
            type="button"
            // The way out when a photo cannot pass, so highlight it on failure.
            variant={!loading && !result?.passed ? "default" : "outline"}
            size="sm"
            onClick={onRetake}
            className="rounded-full"
          >
            {fromCamera ? (
              <IconRefresh className="size-3.5" />
            ) : (
              <IconUpload className="size-3.5" />
            )}
            {fromCamera ? "Retake photo" : "Upload a different photo"}
          </Button>
          <Button
            type="button"
            variant={!loading && !result?.passed ? "outline" : "default"}
            size="sm"
            disabled={loading || !result?.passed}
            onClick={onPass}
            className="ml-auto rounded-full px-5"
          >
            {loading ? "Checking…" : "Analyze skin"}
          </Button>
        </div>
      </ScanStepShell>
    </ScanStepFrame>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}
