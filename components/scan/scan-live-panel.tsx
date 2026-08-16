"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  IconLoader2,
  IconPlayerStop,
  IconSparkles,
  IconSun,
  IconUser,
  IconVideo,
} from "@tabler/icons-react"
import { GoogleGenAI, type LiveServerMessage } from "@google/genai"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import { ScanAnalyzingOverlay } from "@/components/scan/scan-analyzing-overlay"
import { ScanCameraPicker } from "@/components/scan/scan-camera-picker"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useScanCameraDevices } from "@/hooks/use-scan-camera-devices"
import { runQualityGate } from "@/lib/scan/quality-gate"
import type { LiveSessionUsage, QualityCheckResult } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ScanLivePanelProps = {
  onComplete: (result: {
    transcript: string
    bestFrameBlob: Blob
    previewUrl: string
    sessionDurationMs: number
    sessionUsage: LiveSessionUsage | null
  }) => void
  onCancel: () => void
  onErrorChange?: (hasError: boolean) => void
}

const INITIAL_QUALITY: QualityCheckResult = {
  faceDetected: false,
  faceCount: 0,
  faceCentered: false,
  lightingScore: 0,
  lightingBand: "too_dark",
  skinCoverage: 0,
  skinDetail: 0,
  cropSubject: "none",
  isPlausibleSkin: false,
  issues: [],
  passed: false,
}

const LIVE_OBSERVATION_PROMPT =
  "Begin cosmetic skin observation. Describe what you see briefly."

type LiveTokenResponse =
  | { ok: true; token: string; modelId: string; apiVersion: "v1alpha" }
  | { ok: false; error: string }

type LiveSessionHandle = {
  close: () => void
  sendRealtimeInput: (params: {
    video?: { data: string; mimeType: string }
  }) => void
  sendClientContent: (params: {
    turns?: string
    turnComplete?: boolean
  }) => void
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function extractLiveMessageText(message: LiveServerMessage): string[] {
  const lines: string[] = []
  const content = message.serverContent

  if (content?.outputTranscription?.text) {
    lines.push(content.outputTranscription.text)
  }
  if (content?.inputTranscription?.text) {
    lines.push(content.inputTranscription.text)
  }
  if (content?.modelTurn?.parts) {
    for (const part of content.modelTurn.parts) {
      if (part.text) lines.push(part.text)
    }
  }

  const aggregated = message.text
  if (aggregated) lines.push(aggregated)

  return lines
}

function getLiveObservationText(
  connectingLive: boolean,
  transcriptPreview: string,
  quality: QualityCheckResult,
): string {
  if (connectingLive) return "Connecting…"
  if (transcriptPreview) return transcriptPreview
  if (!quality.faceDetected) return "Keep one face centered in frame"
  if (quality.lightingBand !== "ok") return "Use even, natural lighting when possible"
  return "Hold still while we read your skin"
}

export function ScanLivePanel({
  onComplete,
  onCancel,
  onErrorChange,
}: ScanLivePanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const sessionRef = useRef<LiveSessionHandle | null>(null)
  const transcriptRef = useRef<string[]>([])
  const bestFrameRef = useRef<Blob | null>(null)
  const startedAtRef = useRef<number>(0)
  const frameTimerRef = useRef<number | null>(null)
  const sessionStartedRef = useRef(false)
  const sessionUsageRef = useRef<LiveSessionUsage | null>(null)
  const finishingRef = useRef(false)
  const qualityCheckingRef = useRef(false)
  const qualityRef = useRef<QualityCheckResult>(INITIAL_QUALITY)

  const {
    devices,
    activeDeviceId,
    activeLabel,
    ready,
    switching,
    error: cameraError,
    shouldMirror,
    setVideoElement,
    selectDevice,
    stopStream,
  } = useScanCameraDevices()

  const onVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      setVideoElement(node)
    },
    [setVideoElement],
  )

  const [streaming, setStreaming] = useState(false)
  const [connectingLive, setConnectingLive] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [quality, setQuality] = useState<QualityCheckResult>(INITIAL_QUALITY)
  const [transcriptPreview, setTranscriptPreview] = useState("")
  const [finishing, setFinishing] = useState(false)

  qualityRef.current = quality

  finishingRef.current = finishing

  const error = liveError ?? cameraError
  const pickerLocked = switching || streaming || finishing
  const lightingOk = quality.lightingBand === "ok"
  const showConnectingOverlay = connectingLive && !error

  useEffect(() => {
    onErrorChange?.(Boolean(error))
  }, [error, onErrorChange])

  useEffect(() => {
    return () => onErrorChange?.(false)
  }, [onErrorChange])

  const captureFrameBlob = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    if (shouldMirror) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85)
    })
  }, [shouldMirror])

  const captureFrameBlobRef = useRef(captureFrameBlob)
  captureFrameBlobRef.current = captureFrameBlob

  const appendTranscript = useCallback((line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    transcriptRef.current.push(trimmed)
    setTranscriptPreview(transcriptRef.current.slice(-3).join(" "))
  }, [])

  const appendTranscriptRef = useRef(appendTranscript)
  appendTranscriptRef.current = appendTranscript

  const teardownLiveSession = useCallback(() => {
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }
    sessionRef.current?.close()
    sessionRef.current = null
    sessionStartedRef.current = false
    setStreaming(false)
    setConnectingLive(false)
  }, [])

  const startFrameLoop = useCallback(() => {
    if (frameTimerRef.current !== null) return

    frameTimerRef.current = window.setInterval(() => {
      void (async () => {
        const videoEl = videoRef.current
        const liveSession = sessionRef.current
        if (!videoEl || !liveSession) return

        const blob = await captureFrameBlobRef.current()
        if (!blob) return

        const gate = qualityRef.current
        if (gate.passed || gate.faceDetected) {
          bestFrameRef.current = blob
        }

        const arrayBuffer = await blob.arrayBuffer()
        liveSession.sendRealtimeInput({
          video: {
            data: bufferToBase64(arrayBuffer),
            mimeType: "image/jpeg",
          },
        })
      })()
    }, 1000)
  }, [])

  useEffect(() => {
    if (!ready || finishing) return

    const interval = window.setInterval(() => {
      void (async () => {
        const video = videoRef.current
        if (!video || video.videoWidth === 0 || qualityCheckingRef.current) return

        qualityCheckingRef.current = true
        try {
          const result = await runQualityGate(video)
          setQuality(result)
        } catch {
          // Best-effort quality hints during live preview
        } finally {
          qualityCheckingRef.current = false
        }
      })()
    }, 400)

    return () => window.clearInterval(interval)
  }, [finishing, ready])

  useEffect(() => {
    if (!ready || finishing || sessionStartedRef.current) return

    let cancelled = false
    sessionStartedRef.current = true
    setConnectingLive(true)
    setLiveError(null)

    async function startLiveSession() {
      try {
        const tokenResponse = await fetch("/api/scan/live/token", {
          method: "POST",
        })
        const tokenData = (await tokenResponse.json()) as LiveTokenResponse
        if (cancelled) return

        if (!tokenResponse.ok || !tokenData.ok) {
          setLiveError(
            tokenData.ok ? "Could not start live scan." : tokenData.error,
          )
          setConnectingLive(false)
          sessionStartedRef.current = false
          return
        }

        const ai = new GoogleGenAI({
          apiKey: tokenData.token,
          httpOptions: { apiVersion: tokenData.apiVersion },
        })

        const session = await ai.live.connect({
          model: tokenData.modelId,
          callbacks: {
            onopen: () => {
              if (cancelled) return
              setStreaming(true)
              setConnectingLive(false)
              startedAtRef.current = Date.now()
              startFrameLoop()
            },
            onmessage: (message) => {
              // Live reports running session totals, so keep the latest.
              const usage = message.usageMetadata
              if (usage) {
                sessionUsageRef.current = {
                  promptTokenCount: usage.promptTokenCount ?? 0,
                  responseTokenCount: usage.responseTokenCount ?? 0,
                  totalTokenCount: usage.totalTokenCount ?? 0,
                }
              }
              for (const line of extractLiveMessageText(message)) {
                appendTranscriptRef.current(line)
              }
            },
            onerror: (event) => {
              if (!cancelled) {
                setLiveError(event.message || "Live scan connection error")
                setConnectingLive(false)
              }
            },
            onclose: () => {
              if (cancelled || finishingRef.current) return
              setStreaming(false)
              setConnectingLive(false)
              setLiveError("Live connection lost. Try again.")
            },
          },
        })

        if (cancelled) {
          session.close()
          sessionStartedRef.current = false
          return
        }

        sessionRef.current = session as LiveSessionHandle
        sessionRef.current.sendClientContent({
          turns: LIVE_OBSERVATION_PROMPT,
          turnComplete: true,
        })
      } catch (err) {
        if (!cancelled) {
          setLiveError(
            err instanceof Error ? err.message : "Could not start live scan.",
          )
          setConnectingLive(false)
          sessionStartedRef.current = false
        }
      }
    }

    void startLiveSession()

    return () => {
      cancelled = true
      teardownLiveSession()
    }
  }, [finishing, ready, startFrameLoop, teardownLiveSession])

  const handleFinish = useCallback(async () => {
    finishingRef.current = true
    setFinishing(true)

    teardownLiveSession()
    stopStream()

    const blob = bestFrameRef.current ?? (await captureFrameBlob())
    if (!blob) {
      setLiveError("Could not capture a frame from your live scan.")
      setFinishing(false)
      return
    }

    const previewUrl = URL.createObjectURL(blob)
    onComplete({
      transcript: transcriptRef.current.join("\n"),
      bestFrameBlob: blob,
      previewUrl,
      sessionDurationMs: startedAtRef.current
        ? Date.now() - startedAtRef.current
        : 0,
      sessionUsage: sessionUsageRef.current,
    })
  }, [captureFrameBlob, onComplete, stopStream, teardownLiveSession])

  const observationText = getLiveObservationText(
    connectingLive,
    transcriptPreview,
    quality,
  )

  return (
    <div className="space-y-4">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-background">
          <video
            ref={onVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "mx-auto aspect-[3/4] h-[min(48svh,20rem)] w-full object-cover",
              shouldMirror && "scale-x-[-1]",
            )}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/80" />

          {showConnectingOverlay ? <ScanAnalyzingOverlay /> : null}

          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium",
                showConnectingOverlay &&
                  "border-primary/30 bg-primary/10 text-primary",
                streaming &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                error &&
                  !streaming &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {showConnectingOverlay ? (
                <>
                  <IconLoader2 className="size-3.5 animate-spin" aria-hidden />
                  <IconVideo className="size-3.5" aria-hidden />
                  Connecting…
                </>
              ) : streaming ? (
                <>
                  <IconVideo className="size-3.5" aria-hidden />
                  Live — hold still
                </>
              ) : (
                <>
                  <IconVideo className="size-3.5" aria-hidden />
                  Error
                </>
              )}
            </div>
            <ScanCameraPicker
              variant="header"
              devices={devices}
              activeDeviceId={activeDeviceId}
              activeLabel={activeLabel}
              onSelect={(deviceId) => void selectDevice(deviceId)}
              disabled={pickerLocked}
              switching={switching}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 bg-background/35 mask-[radial-gradient(ellipse_36%_43%_at_50%_50%,transparent_98%,black_100%)]"
            />
            <div className="relative h-[62%] w-[72%] rounded-[50%] border-2 border-primary/70" />
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 p-3">
            <div className="flex flex-wrap justify-center gap-2">
              <AnimatedBadge
                status={quality.faceDetected ? "success" : "warning"}
                size="sm"
                icon={<IconUser className="size-3" />}
              >
                {quality.faceDetected ? "Face detected" : "Find your face"}
              </AnimatedBadge>
              <AnimatedBadge
                status={lightingOk ? "success" : "warning"}
                size="sm"
                icon={<IconSun className="size-3" />}
              >
                {lightingOk ? "Lighting OK" : "Adjust lighting"}
              </AnimatedBadge>
              <ScanCameraPicker
                variant="badge"
                devices={devices}
                activeDeviceId={activeDeviceId}
                activeLabel={activeLabel}
                onSelect={(deviceId) => void selectDevice(deviceId)}
                disabled={pickerLocked}
                switching={switching}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <IconSparkles className="size-4" />
            Live observations
          </div>
          <p className="text-muted-foreground">{observationText}</p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Live scan unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3">
          <Button
            type="button"
            className="w-full gap-2"
            disabled={!ready || finishing || Boolean(error)}
            onClick={() => void handleFinish()}
          >
            <IconPlayerStop className="size-4" />
            {finishing ? "Finishing…" : "Finish scan"}
          </Button>
          <Button
            type="button"
            className="w-full"
            variant="outline"
            onClick={onCancel}
          >
            Back
        </Button>
      </div>
    </div>
  )
}
