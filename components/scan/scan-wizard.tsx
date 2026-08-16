"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { ScanAnalyzingView } from "@/components/scan/scan-analyzing-view"
import { ScanCapturePanel } from "@/components/scan/scan-capture-panel"
import { ScanImageEditor } from "@/components/scan/scan-image-editor"
import { ScanQualityStep } from "@/components/scan/scan-quality-step"
import { ScanReportModal } from "@/components/scan/scan-report-modal"
import { ScanResultsView } from "@/components/scan/scan-results-view"
import { EASE_OUT } from "@/lib/ease"
import type {
  CaptureMode,
  LiveScanPayload,
  ScanClimateContext,
  ScanTier,
  ScanWizardStep,
  SkinAssessment,
} from "@/lib/scan/types"
import { cn } from "@/lib/utils"

export function ScanWizard({ scanTier }: { scanTier: ScanTier }) {
  const [step, setStep] = useState<ScanWizardStep>("capture")
  const [captureMode, setCaptureMode] = useState<CaptureMode>("upload")
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null)
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(
    null,
  )
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [captureSource, setCaptureSource] = useState<CaptureMode>("upload")
  const [livePayload, setLivePayload] = useState<LiveScanPayload | null>(null)
  const [assessment, setAssessment] = useState<SkinAssessment | null>(null)
  const [climateContext, setClimateContext] =
    useState<ScanClimateContext | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const urlsRef = useRef<string[]>([])

  const trackUrl = useCallback((url: string) => {
    urlsRef.current.push(url)
  }, [])

  const revokeAllUrls = useCallback(() => {
    for (const url of urlsRef.current) {
      URL.revokeObjectURL(url)
    }
    urlsRef.current = []
  }, [])

  useEffect(() => () => revokeAllUrls(), [revokeAllUrls])

  const resetScan = useCallback(() => {
    revokeAllUrls()
    setStep("capture")
    setCaptureMode("upload")
    setRawPreviewUrl(null)
    setCroppedPreviewUrl(null)
    setImageBlob(null)
    setLivePayload(null)
    setAssessment(null)
    setClimateContext(null)
    setScanId(null)
    setReportOpen(false)
  }, [revokeAllUrls])

  /**
   * Start over from capture, landing on whichever source the photo came from
   * so an uploaded photo returns to the file picker rather than the camera.
   */
  const restartCapture = useCallback(() => {
    resetScan()
    setCaptureMode(captureSource === "camera" ? "camera" : "upload")
  }, [captureSource, resetScan])

  const handleBackToEdit = useCallback(() => {
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl)
      urlsRef.current = urlsRef.current.filter((url) => url !== croppedPreviewUrl)
    }
    setCroppedPreviewUrl(null)
    setImageBlob(null)
    setLivePayload(null)
    setAssessment(null)
    setClimateContext(null)
    setScanId(null)
    setReportOpen(false)
    setStep("edit")
  }, [croppedPreviewUrl])

  const handleLiveComplete = useCallback(
    (result: {
      transcript: string
      bestFrameBlob: Blob
      previewUrl: string
      sessionDurationMs: number
      sessionUsage: LiveScanPayload["sessionUsage"]
    }) => {
      trackUrl(result.previewUrl)
      setCroppedPreviewUrl(result.previewUrl)
      setImageBlob(result.bestFrameBlob)
      setLivePayload({
        transcript: result.transcript,
        sessionDurationMs: result.sessionDurationMs,
        sessionUsage: result.sessionUsage,
      })
      setStep("analyzing")
    },
    [trackUrl],
  )

  const handleImageSelected = useCallback(
    (file: File, previewUrl: string, source: CaptureMode) => {
      trackUrl(previewUrl)
      setCaptureSource(source)
      setRawPreviewUrl(previewUrl)
      setImageBlob(file)
      setStep("edit")
    },
    [trackUrl],
  )

  const handleCropConfirm = useCallback(
    (blob: Blob, previewUrl: string) => {
      trackUrl(previewUrl)
      setCroppedPreviewUrl(previewUrl)
      setImageBlob(blob)
      setStep("quality")
    },
    [trackUrl],
  )

  const handleQualityPass = useCallback(() => {
    setStep("analyzing")
  }, [])

  const handleAnalysisComplete = useCallback(
    (result: {
      assessment: SkinAssessment
      scanId: string
      climateContext: ScanClimateContext | null
    }) => {
      setAssessment(result.assessment)
      setClimateContext(result.climateContext)
      setScanId(result.scanId)
      setStep("results")
    },
    [],
  )

  const isReportPhase = step === "results"

  return (
    <div className="relative flex min-h-svh flex-col">
      <div
        className={cn(
          "flex flex-1 flex-col items-center px-4",
          isReportPhase
            ? "justify-start pb-12 pt-10"
            : "justify-center py-6 sm:py-10",
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isReportPhase ? "report-phase" : step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={cn(
              "w-full",
              isReportPhase ? "mx-auto max-w-5xl" : "flex justify-center",
            )}
          >
            {step === "capture" ? (
              <ScanCapturePanel
                mode={captureMode}
                scanTier={scanTier}
                onModeChange={setCaptureMode}
                onImageSelected={handleImageSelected}
                onLiveComplete={handleLiveComplete}
              />
            ) : null}

            {step === "edit" && rawPreviewUrl ? (
              <ScanImageEditor
                imageSrc={rawPreviewUrl}
                onConfirm={handleCropConfirm}
                onRetake={resetScan}
                onDelete={resetScan}
              />
            ) : null}

            {step === "quality" && croppedPreviewUrl ? (
              <ScanQualityStep
                imageSrc={croppedPreviewUrl}
                captureSource={captureSource}
                onPass={handleQualityPass}
                onReEdit={handleBackToEdit}
                onRetake={restartCapture}
              />
            ) : null}

            {step === "analyzing" && imageBlob && croppedPreviewUrl ? (
              <ScanAnalyzingView
                imageSrc={croppedPreviewUrl}
                imageBlob={imageBlob}
                livePayload={livePayload ?? undefined}
                onComplete={handleAnalysisComplete}
                onRetry={resetScan}
              />
            ) : null}

            {step === "results" && assessment && croppedPreviewUrl ? (
              <ScanResultsView
                assessment={assessment}
                climateContext={climateContext}
                imageSrc={croppedPreviewUrl}
                scanId={scanId}
                onNewScan={resetScan}
                onReEdit={handleBackToEdit}
                onViewReport={() => setReportOpen(true)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {assessment ? (
        <ScanReportModal
          open={reportOpen}
          onOpenChange={setReportOpen}
          assessment={assessment}
          climateContext={climateContext}
          imageSrc={croppedPreviewUrl}
          scanId={scanId}
        />
      ) : null}
    </div>
  )
}
