"use client"

import { useEffect, useRef, useState } from "react"
import { IconCheck, IconLoader2, IconRefresh } from "@tabler/icons-react"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import { ScanAnalyzingOverlay } from "@/components/scan/scan-analyzing-overlay"
import { ScanHeaderActionButton } from "@/components/scan/scan-header-action"
import { ScanPhotoFrame } from "@/components/scan/scan-photo-frame"
import { ScanStepFrame } from "@/components/scan/scan-step-frame"
import { ScanStepShell } from "@/components/scan/scan-step-shell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { toUserFacingScanError } from "@/lib/scan/errors"
import type {
  AnalyzeScanResult,
  LiveScanPayload,
  ScanClimateContext,
  SkinAssessment,
} from "@/lib/scan/types"

const ANALYSIS_PHASE_LABELS = [
  "Checking local climate",
  "Locating facial regions",
  "Assessing texture bands",
  "Matching recommendations",
] as const

const PHASE_ADVANCE_MS = 900
const FINAL_PHASE_INDEX = ANALYSIS_PHASE_LABELS.length - 1

const WAIT_DESCRIPTIONS = [
  "Please wait while we review your photo...",
  "Hang tight as we assess your skin profile...",
  "Just a moment while we tailor your recommendations...",
  "Almost there — putting your report together...",
] as const

type ScanAnalyzingViewProps = {
  imageSrc: string
  imageBlob: Blob
  livePayload?: LiveScanPayload
  onComplete: (result: {
    assessment: SkinAssessment
    scanId: string
    climateContext: ScanClimateContext | null
  }) => void
  onRetry?: () => void
}

export function ScanAnalyzingView({
  imageSrc,
  imageBlob,
  livePayload,
  onComplete,
  onRetry,
}: ScanAnalyzingViewProps) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [waitDescriptionIndex, setWaitDescriptionIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  /**
   * The image this component has already sent for analysis.
   *
   * Analysis is not a read: the endpoint creates a scan row and debits the
   * user's balance, so firing it twice bills two scans for one capture. The
   * previous guard was a local `cancelled` flag, which only suppressed the
   * response handler; both requests still reached the server. StrictMode's
   * double effect invocation was enough to trigger it on every dev scan. A ref
   * survives that remount, so the second pass sees the blob already sent.
   */
  const requestedForRef = useRef<Blob | null>(null)
  /** False once the component is genuinely gone, so late results are dropped. */
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const activeLabel = error
    ? "Analysis failed"
    : isComplete
      ? "Analysis complete"
      : ANALYSIS_PHASE_LABELS[Math.min(phaseIndex, FINAL_PHASE_INDEX)]

  useEffect(() => {
    if (error || isComplete) return

    const intervalId = window.setInterval(() => {
      setWaitDescriptionIndex((current) => (current + 1) % WAIT_DESCRIPTIONS.length)
    }, 3200)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [error, isComplete])

  const description = error
    ? "Something went wrong — see details below."
    : isComplete
      ? "Your personalized report is ready."
      : WAIT_DESCRIPTIONS[waitDescriptionIndex]

  // Purely presentational: the phase ticker is decoupled from the request so
  // re-running it can never re-trigger analysis.
  useEffect(() => {
    let cancelled = false
    let stepIndex = 0

    const advancePhase = () => {
      if (cancelled) return

      setPhaseIndex(stepIndex)

      if (stepIndex < FINAL_PHASE_INDEX) {
        window.setTimeout(() => {
          if (cancelled) return
          stepIndex += 1
          advancePhase()
        }, PHASE_ADVANCE_MS)
      }
    }

    advancePhase()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (requestedForRef.current === imageBlob) return
    requestedForRef.current = imageBlob

    async function run() {
      try {
        const mimeType = imageBlob.type.startsWith("image/")
          ? imageBlob.type
          : "image/jpeg"

        const formData = new FormData()
        formData.append("image", imageBlob, "scan.jpg")
        formData.append("mimeType", mimeType)

        if (livePayload) {
          formData.append("transcript", livePayload.transcript)
          formData.append(
            "sessionDurationMs",
            String(livePayload.sessionDurationMs),
          )
          if (livePayload.sessionUsage) {
            formData.append(
              "sessionUsage",
              JSON.stringify(livePayload.sessionUsage),
            )
          }
        }

        const endpoint = livePayload
          ? "/api/scan/live/complete"
          : "/api/scan/analyze"

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        })

        const result = (await response.json()) as AnalyzeScanResult
        if (!activeRef.current) return

        if (!response.ok || !result.ok) {
          const message = result.ok
            ? toUserFacingScanError(new Error("Skin analysis failed"))
            : result.error
          setError(message)
          return
        }

        setPhaseIndex(FINAL_PHASE_INDEX)
        setIsComplete(true)
        onComplete({
          assessment: result.assessment,
          scanId: result.scanId,
          climateContext: result.climateContext,
        })
      } catch {
        if (activeRef.current) {
          setError(toUserFacingScanError(new Error("Skin analysis failed")))
        }
      }
    }

    void run()
  }, [imageBlob, livePayload, onComplete])

  return (
    <ScanStepFrame
      headerTrailing={
        error && onRetry ? (
          <>
            <ScanHeaderActionButton
              label="Retry"
              icon={<IconRefresh className="size-3.5" />}
              onClick={onRetry}
            />
          </>
        ) : undefined
      }
    >
      <ScanStepShell
        step="analyzing"
        title="Analyzing your scan"
        description={description}
      >
        <ScanPhotoFrame src={imageSrc} alt="Scan photo">
          {!error && !isComplete ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/45 backdrop-blur-[1px]">
              <ScanAnalyzingOverlay activePhase={phaseIndex} />
              <AnimatedBadge status="loading" size="md" aria-live="polite">
                {activeLabel}
              </AnimatedBadge>
            </div>
          ) : null}
        </ScanPhotoFrame>

        {!error ? (
          <ol className="space-y-1 rounded-2xl border border-border/70 bg-muted/20 p-2.5">
            {ANALYSIS_PHASE_LABELS.map((label, index) => {
              const done = isComplete || index < phaseIndex
              const active = !isComplete && index === phaseIndex

              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-300",
                    active && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-300",
                      done
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground/60",
                    )}
                  >
                    {done ? (
                      <IconCheck className="size-3" aria-hidden />
                    ) : active ? (
                      <IconLoader2 className="size-3 animate-spin" aria-hidden />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs transition-colors duration-300",
                      done
                        ? "text-muted-foreground"
                        : active
                          ? "font-medium text-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>We couldn&apos;t finish your scan</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}

        <p className="px-1 pb-0.5 text-center text-[11px] leading-relaxed text-muted-foreground">
          {livePayload
            ? "Your live session is finalized in memory. It is not stored or included in saved reports."
            : "Your photo is analyzed in memory. It is not stored or included in saved reports."}
        </p>
      </ScanStepShell>
    </ScanStepFrame>
  )
}
