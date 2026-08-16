"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"
import {
  IconArrowLeft,
  IconCameraRotate,
  IconGripHorizontal,
  IconSun,
  IconUser,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { AnimatedBadge } from "@/components/motion/animated-badge"
import { Button } from "@/components/ui/button"
import { ScanCameraPicker } from "@/components/scan/scan-camera-picker"
import {
  SCAN_CAMERA_HEIGHT,
  useScanCameraHeight,
} from "@/hooks/use-scan-camera-height"
import { useScanCameraDevices } from "@/hooks/use-scan-camera-devices"
import { runQualityGate } from "@/lib/scan/quality-gate"
import type { QualityCheckResult } from "@/lib/scan/types"
import { cn } from "@/lib/utils"

type ScanCameraViewProps = {
  fullscreen?: boolean
  onCapture: (file: File, previewUrl: string) => void
  onSwitchToUpload?: () => void
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isMobile
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

export function ScanCameraView({
  fullscreen,
  onCapture,
  onSwitchToUpload,
}: ScanCameraViewProps) {
  const isMobile = useIsMobile()
  const isFullscreen = fullscreen ?? isMobile
  const videoRef = useRef<HTMLVideoElement>(null)
  const checkingRef = useRef(false)
  const [quality, setQuality] = useState<QualityCheckResult>(INITIAL_QUALITY)
  const [capturing, setCapturing] = useState(false)
  const [flash, setFlash] = useState(false)
  const { height: embeddedHeight, setHeight: setEmbeddedHeight } =
    useScanCameraHeight()
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  )

  const {
    devices,
    activeDeviceId,
    activeLabel,
    ready,
    switching,
    error,
    shouldMirror,
    setVideoElement,
    selectDevice,
    flipCamera,
    canFlipCamera,
    stopStream,
    startStream,
  } = useScanCameraDevices()

  const onVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      setVideoElement(node)
    },
    [setVideoElement],
  )

  const stopResize = useCallback(() => {
    resizeStateRef.current = null
  }, [])

  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (isFullscreen) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      resizeStateRef.current = {
        startY: event.clientY,
        startHeight: embeddedHeight,
      }
    },
    [embeddedHeight, isFullscreen],
  )

  const handleResizePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const state = resizeStateRef.current
      if (!state) return
      const delta = event.clientY - state.startY
      setEmbeddedHeight(state.startHeight + delta)
    },
    [setEmbeddedHeight],
  )

  const handleResizePointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!resizeStateRef.current) return
      event.currentTarget.releasePointerCapture(event.pointerId)
      stopResize()
    },
    [stopResize],
  )

  const handleResizeDoubleClick = useCallback(() => {
    setEmbeddedHeight(SCAN_CAMERA_HEIGHT.default)
  }, [setEmbeddedHeight])

  useEffect(() => {
    if (!ready) return

    const interval = window.setInterval(async () => {
      const video = videoRef.current
      if (!video || video.videoWidth === 0 || checkingRef.current) return

      checkingRef.current = true
      try {
        const result = await runQualityGate(video)
        setQuality(result)
      } catch {
        // ignore transient detection errors during live preview
      } finally {
        checkingRef.current = false
      }
    }, 400)

    return () => window.clearInterval(interval)
  }, [ready])

  const canCapture =
    ready &&
    !capturing &&
    !switching &&
    quality.faceDetected &&
    quality.faceCount === 1 &&
    quality.lightingBand === "ok"

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || !canCapture) return

    setCapturing(true)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 260)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      if (shouldMirror) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      })
      if (!blob) return

      const file = new File([blob], `scan-${Date.now()}.jpg`, {
        type: "image/jpeg",
      })
      const previewUrl = URL.createObjectURL(file)
      stopStream()
      onCapture(file, previewUrl)
    } finally {
      setCapturing(false)
    }
  }

  const lightingOk = quality.lightingBand === "ok"
  const guidance = error
    ? null
    : !ready
      ? "Starting your camera…"
      : canCapture
        ? "Looking great. Hold still and tap the shutter."
        : (quality.issues[0] ??
          (quality.faceDetected ? "Center your face in the oval." : "Find your face in the oval."))

  const shutter = (
    <button
      type="button"
      disabled={!canCapture}
      onClick={() => void handleCapture()}
      aria-label="Take photo"
      className={cn(
        "group pointer-events-auto relative grid size-18 place-items-center rounded-full transition-transform active:scale-95 disabled:cursor-not-allowed",
        canCapture ? "cursor-pointer" : "cursor-not-allowed",
      )}
    >
      {canCapture ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/30"
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full border-2 backdrop-blur-md transition-colors duration-300",
          canCapture
            ? "border-primary bg-background/40"
            : "border-foreground/25 bg-background/30",
        )}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={canCapture ? "ready" : "wait"}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "relative size-12 rounded-full shadow-lg transition-colors duration-300",
            canCapture
              ? "bg-primary shadow-primary/40"
              : "bg-foreground/25 shadow-transparent",
          )}
        />
      </AnimatePresence>
    </button>
  )

  const cameraViewport = (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-foreground/5",
        isFullscreen
          ? "fixed inset-0 z-50"
          : "scan-viewport w-full rounded-[1.75rem] border border-border/70",
      )}
      style={isFullscreen ? undefined : { height: embeddedHeight }}
    >
      <video
        ref={onVideoRef}
        autoPlay
        playsInline
        muted
        className={cn("size-full object-cover", shouldMirror && "scale-x-[-1]")}
      />

      {/* Scrims sit only where chrome does, so the preview itself stays clean. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-background/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-background/85 via-background/45 to-transparent" />

      <AnimatePresence>
        {flash ? (
          <motion.div
            key="flash"
            aria-hidden
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-30 bg-background"
          />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2",
          isFullscreen
            ? "p-4 pt-[max(1rem,env(safe-area-inset-top))]"
            : "p-3.5",
        )}
      >
        {isFullscreen && onSwitchToUpload ? (
          <button
            type="button"
            onClick={onSwitchToUpload}
            aria-label="Back to upload"
            className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition-transform active:scale-95"
          >
            <IconArrowLeft className="size-4" />
          </button>
        ) : (
          <div />
        )}
        <ScanCameraPicker
          variant="header"
          devices={devices}
          activeDeviceId={activeDeviceId}
          activeLabel={activeLabel}
          onSelect={(deviceId) => void selectDevice(deviceId)}
          disabled={capturing}
          switching={switching}
          className={isFullscreen ? "hidden" : undefined}
        />
      </div>

      {/* Face guide: dims everything outside the oval and turns primary once
          the frame is good enough to capture. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-background/45 mask-[radial-gradient(ellipse_36%_43%_at_50%_50%,transparent_98%,black_100%)]"
        />
        <motion.div
          aria-hidden
          className={cn(
            "relative h-[64%] w-[74%] rounded-[50%] border-2 transition-colors duration-500",
            canCapture
              ? "border-primary shadow-[0_0_40px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
              : quality.faceDetected
                ? "border-primary/50"
                : "border-foreground/30",
          )}
          animate={
            canCapture ? { scale: [1, 1.012, 1] } : { scale: 1 }
          }
          transition={{
            duration: 2.4,
            repeat: canCapture ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 space-y-3.5",
          isFullscreen
            ? "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "p-3.5",
        )}
      >
        <div className="flex flex-wrap justify-center gap-1.5">
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
            disabled={capturing}
            switching={switching}
          />
        </div>

        {error ? (
          <div className="pointer-events-auto mx-auto max-w-sm space-y-3 rounded-2xl border border-destructive/30 bg-background/80 p-3 text-center backdrop-blur-md">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => void startStream()}
              >
                Retry camera
              </Button>
              {onSwitchToUpload ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={onSwitchToUpload}
                >
                  Use photo upload instead
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {guidance ? (
          <div className="flex justify-center" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={guidance}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "pointer-events-none max-w-xs rounded-full px-3 py-1 text-center text-xs backdrop-blur-md",
                  canCapture
                    ? "bg-primary/10 text-primary"
                    : "bg-background/60 text-muted-foreground",
                )}
              >
                {guidance}
              </motion.p>
            </AnimatePresence>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-8">
          {isFullscreen ? (
            canFlipCamera ? (
              <button
                type="button"
                disabled={capturing || switching}
                onClick={() => void flipCamera()}
                aria-label="Flip camera"
                className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition-transform active:scale-95 disabled:opacity-45"
              >
                <IconCameraRotate className="size-5" />
              </button>
            ) : (
              <div className="size-10 shrink-0" aria-hidden />
            )
          ) : null}
          {shutter}
          {isFullscreen ? <div className="size-10 shrink-0" aria-hidden /> : null}
        </div>
      </div>
    </div>
  )

  if (isFullscreen) {
    return cameraViewport
  }

  return (
    <div className="w-full">
      {cameraViewport}
      <button
        type="button"
        aria-label="Resize camera preview. Double-click to reset."
        title="Drag to resize. Double-click to reset."
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={handleResizeDoubleClick}
        className="group mt-1 flex w-full cursor-ns-resize touch-none items-center justify-center gap-1.5 rounded-xl py-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <IconGripHorizontal className="size-4" aria-hidden />
        <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
          Drag to resize
        </span>
      </button>
    </div>
  )
}
