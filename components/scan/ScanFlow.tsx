"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import {
  IconCamera,
  IconCheck,
  IconChevronLeft,
  IconDownload,
  IconFileAnalytics,
  IconLoader2,
  IconPhotoScan,
  IconRefresh,
  IconReportAnalytics,
  IconShieldCheck,
  IconSparkles,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

type ScanStep = "intro" | "capture" | "review" | "processing" | "results"
type ScanInputMethod = "camera" | "upload" | null
type ScanAnalysis = {
  summary: string
  cosmeticFindings: Array<{
    label: string
    band: string
    observation: string
  }>
  recommendations: Array<{
    title: string
    reason: string
  }>
  routineTips: string[]
  quality: {
    lighting: string
    framing: string
    confidence: string
  }
  disclaimer: string
  source: "gemini" | "fallback"
  model: string
}

type AnalyzeScanResponse = {
  success: boolean
  fallback: boolean
  error?: string
  analysis: ScanAnalysis | null
}

const steps: Array<{ id: ScanStep; label: string }> = [
  { id: "intro", label: "Intro" },
  { id: "capture", label: "Capture" },
  { id: "review", label: "Review" },
  { id: "processing", label: "Processing" },
  { id: "results", label: "Results" },
]

const stepCopy: Record<ScanStep, { title: string; description: string }> = {
  intro: {
    title: "Start your free cosmetic skin scan",
    description:
      "Aurora SkinSense keeps this flow privacy-first: consent comes before capture, and the scan is framed as cosmetic wellness guidance only.",
  },
  capture: {
    title: "Capture or upload a clear face image",
    description:
      "Use your camera or upload an existing image. Keep your face centered with even lighting for the clearest cosmetic skin review.",
  },
  review: {
    title: "Review your selected image",
    description:
      "Make sure the image is clear before continuing. You can retake, replace, or remove it before processing.",
  },
  processing: {
    title: "Reviewing visible cosmetic indicators",
    description:
      "Aurora is preparing coarse cosmetic insight bands for visible texture, tone unevenness, hydration appearance, and redness appearance.",
  },
  results: {
    title: "Your cosmetic skin report is ready",
    description:
      "This sample result is cosmetic wellness guidance only and is not a medical diagnosis.",
  },
}

const introCards = [
  { label: "Consent before scan", icon: IconShieldCheck },
  { label: "Camera or upload", icon: IconCamera },
  { label: "Report, not diagnosis", icon: IconFileAnalytics },
] as const

const captureTips = [
  "Face centered in frame",
  "Even lighting preferred",
  "No medical diagnosis",
  "Image reviewed only after consent",
] as const

const processingChecks = ["Image received", "Gemini review", "Cosmetic report"] as const

function StepIndicator({ currentStep }: { currentStep: ScanStep }) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep)

  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isComplete = index < currentIndex

        return (
          <div
            key={step.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <span
              className={
                isActive || isComplete
                  ? "flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : "flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
              }
            >
              {isComplete ? <IconCheck className="size-4" /> : index + 1}
            </span>
            <span
              className={
                isActive
                  ? "text-sm font-semibold text-foreground"
                  : "text-sm text-muted-foreground"
              }
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PrivacyNotice() {
  return (
    <div className="rounded-lg border border-border bg-muted p-4 text-sm leading-6 text-muted-foreground">
      <IconShieldCheck className="mr-2 inline size-4 text-primary" />
      Aurora SkinSense provides cosmetic skin wellness insights and product
      recommendations only. This is not a medical diagnosis tool.
    </div>
  )
}

function IntroStep() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {introCards.map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <Icon className="size-6 text-primary" />
            <p className="mt-4 text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>
      <PrivacyNotice />
    </div>
  )
}

function CameraPanel({
  videoRef,
  canvasRef,
  cameraError,
  isCameraActive,
  onStartCamera,
  onCapture,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cameraError: string | null
  isCameraActive: boolean
  onStartCamera: () => void
  onCapture: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        {!isCameraActive ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <IconCamera className="mx-auto size-10 text-primary" />
              <p className="mt-4 text-sm font-medium">Camera preview is off</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Start the camera to capture a scan image. Your browser will ask for permission.
              </p>
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-8 rounded-full border border-primary/50" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {cameraError ? (
        <p className="mt-3 text-sm text-destructive">{cameraError}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" onClick={onStartCamera}>
          <IconCamera className="size-4" />
          {isCameraActive ? "Restart Camera" : "Use Camera"}
        </Button>
        <Button type="button" onClick={onCapture} disabled={!isCameraActive}>
          Capture Image
        </Button>
      </div>
    </div>
  )
}

function UploadPanel({
  fileInputRef,
  onUpload,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-muted p-6 text-center">
        <div>
          <IconUpload className="mx-auto size-10 text-primary" />
          <p className="mt-4 text-sm font-medium">Upload a clear face image</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            JPG, PNG, or WEBP images work best. Images stay local in this demo flow.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload className="size-4" />
            Choose Image
          </Button>
        </div>
      </div>
    </div>
  )
}

function CaptureStep({
  videoRef,
  canvasRef,
  fileInputRef,
  cameraError,
  isCameraActive,
  onStartCamera,
  onCapture,
  onUpload,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  cameraError: string | null
  isCameraActive: boolean
  onStartCamera: () => void
  onCapture: () => void
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <CameraPanel
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraError={cameraError}
          isCameraActive={isCameraActive}
          onStartCamera={onStartCamera}
          onCapture={onCapture}
        />
        <UploadPanel fileInputRef={fileInputRef} onUpload={onUpload} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {captureTips.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
            <IconCheck className="size-4 text-primary" />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewStep({
  selectedImage,
  inputMethod,
  onRetake,
  onRemove,
}: {
  selectedImage: string
  inputMethod: ScanInputMethod
  onRetake: () => void
  onRemove: () => void
}) {
  return (
    <div className="grid gap-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          src={selectedImage}
          alt="Selected skin scan preview"
          fill
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
        Image source: {inputMethod === "camera" ? "Camera capture" : "Image upload"}. Continue
        only if the image is clear and you consent to cosmetic analysis.
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" onClick={onRetake}>
          <IconRefresh className="size-4" />
          Retake or Replace
        </Button>
        <Button type="button" variant="outline" onClick={onRemove}>
          <IconTrash className="size-4" />
          Remove Image
        </Button>
      </div>
    </div>
  )
}

function ProcessingStep({
  analysisError,
  isAnalyzing,
}: {
  analysisError: string | null
  isAnalyzing: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={
            isAnalyzing
              ? "h-full w-2/3 animate-pulse rounded-full bg-primary"
              : "h-full w-full rounded-full bg-primary"
          }
        />
      </div>
      <div className="grid gap-3">
        {processingChecks.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
            {isAnalyzing ? (
              <IconLoader2 className="size-4 animate-spin text-primary" />
            ) : (
              <IconCheck className="size-4 text-primary" />
            )}
            {item}
          </div>
        ))}
      </div>
      {analysisError ? (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          {analysisError}
        </div>
      ) : null}
    </div>
  )
}

function ResultsStep({ analysis }: { analysis: ScanAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
        No cosmetic report is available yet. Return to review and try again.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-border bg-muted p-4">
        <p className="text-sm font-medium">{analysis.summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Source: {analysis.source === "gemini" ? "Gemini AI analysis" : "Fallback guidance"} ·
          Confidence: {analysis.quality.confidence}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {analysis.cosmeticFindings.map((finding) => (
          <div key={finding.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{finding.label}</p>
            <p className="mt-1 font-medium capitalize">{finding.band.replace("_", " ")}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{finding.observation}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium">Aurora recommendations</p>
        <div className="mt-3 grid gap-3">
          {analysis.recommendations.map((recommendation) => (
            <div key={recommendation.title} className="text-sm">
              <p className="font-medium">{recommendation.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{recommendation.reason}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted p-4 text-sm leading-6 text-muted-foreground">
        {analysis.disclaimer}
      </div>
    </div>
  )
}

function ScanPreview({
  currentStep,
  selectedImage,
}: {
  currentStep: ScanStep
  selectedImage: string | null
}) {
  const isProcessing = currentStep === "processing"
  const isResults = currentStep === "results"

  return (
    <div className="relative min-h-80 overflow-hidden rounded-2xl border border-border bg-muted p-4 shadow-sm">
      {selectedImage ? (
        <Image
          src={selectedImage}
          alt="Selected scan preview"
          fill
          unoptimized
          className="object-cover opacity-80"
        />
      ) : (
        <>
          <div className="absolute inset-8 rounded-full border border-primary/40" />
          <div className="absolute inset-x-20 top-16 h-44 rounded-full border border-border bg-background/60" />
        </>
      )}
      <div className="absolute left-1/2 top-20 h-52 w-px -translate-x-1/2 bg-primary/30" />
      <div className="absolute left-16 right-16 top-36 h-px bg-primary/30" />
      <div className="absolute left-20 top-24 size-3 rounded-full bg-primary" />
      <div className="absolute right-24 top-40 size-3 rounded-full bg-primary" />
      <div className="relative z-10 flex items-center justify-between">
        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {steps.find((step) => step.id === currentStep)?.label}
        </span>
        {isProcessing ? (
          <IconLoader2 className="size-5 animate-spin text-primary" />
        ) : isResults ? (
          <IconCheck className="size-5 text-primary" />
        ) : (
          <IconPhotoScan className="size-5 text-primary" />
        )}
      </div>
      <div className="absolute inset-x-8 bottom-6 z-10 rounded-lg border border-border bg-background/90 p-4 backdrop-blur">
        <p className="text-sm font-medium">
          {isResults
            ? "Balanced profile with mild dryness indicators"
            : isProcessing
              ? "Lighting check, face zones, and report generation in progress"
              : selectedImage
                ? "Selected image ready for review"
                : "Camera preview and upload support"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Coarse cosmetic insight bands only.
        </p>
      </div>
    </div>
  )
}

export function ScanFlow() {
  const [currentStep, setCurrentStep] = useState<ScanStep>("intro")
  const [inputMethod, setInputMethod] = useState<ScanInputMethod>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState("aurora-skin-scan.jpg")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<ScanAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const copy = stepCopy[currentStep]

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  function stopCamera() {
    stopCameraStream()
    setIsCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  async function startCamera() {
    setCameraError(null)

    if (!window.isSecureContext) {
      setCameraError("Camera access requires localhost or HTTPS. Open the scan page from a secure browser context.")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available in this browser.")
      return
    }

    try {
      stopCamera()
      const stream = await requestCameraStream()
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        void videoRef.current.play().catch(() => undefined)
      }
      setInputMethod("camera")
      setIsCameraActive(true)
    } catch (error) {
      stopCameraStream()
      setCameraError(getCameraErrorMessage(error))
      setIsCameraActive(false)
    }
  }

  function captureImage() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !isCameraActive) return

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError("Camera preview is still loading. Please wait a moment, then capture again.")
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return

    context.drawImage(video, 0, 0, width, height)
    setSelectedImage(canvas.toDataURL("image/jpeg", 0.92))
    setSelectedFileName("aurora-skin-scan.jpg")
    setCameraError(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setInputMethod("camera")
    stopCamera()
    setCurrentStep("review")
  }

  function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setCameraError("Please choose an image file.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImage(reader.result)
        setSelectedFileName(file.name)
        setAnalysisResult(null)
        setAnalysisError(null)
        setInputMethod("upload")
        stopCamera()
        setCurrentStep("review")
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  function retakeImage() {
    setSelectedImage(null)
    setInputMethod(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setCurrentStep("capture")
  }

  function removeImage() {
    setSelectedImage(null)
    setInputMethod(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setCurrentStep("capture")
  }

  function goBack() {
    if (currentStep === "capture") {
      stopCamera()
      setCurrentStep("intro")
    }
    if (currentStep === "review") setCurrentStep("capture")
    if (currentStep === "processing") setCurrentStep("review")
    if (currentStep === "results") setCurrentStep("processing")
  }

  async function goNext() {
    if (currentStep === "intro") setCurrentStep("capture")
    if (currentStep === "review" && selectedImage) await analyzeSelectedImage()
    if (currentStep === "processing") setCurrentStep("results")
  }

  function restart() {
    stopCamera()
    setSelectedImage(null)
    setSelectedFileName("aurora-skin-scan.jpg")
    setInputMethod(null)
    setCameraError(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setCurrentStep("intro")
  }

  async function analyzeSelectedImage() {
    if (!selectedImage) return

    setCurrentStep("processing")
    setIsAnalyzing(true)
    setAnalysisResult(null)
    setAnalysisError(null)

    try {
      const imageFile = await dataUrlToFile(selectedImage, selectedFileName)
      const formData = new FormData()
      formData.append("image", imageFile)

      const response = await fetch("/api/scan/analyze", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json()) as AnalyzeScanResponse

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? "Aurora could not analyze this image.")
      }

      setAnalysisResult(payload.analysis)
      setAnalysisError(payload.fallback ? payload.error ?? "Fallback cosmetic report returned." : null)
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Aurora could not analyze this image. Please try again.",
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="grid gap-8">
      <StepIndicator currentStep={currentStep} />

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-primary uppercase">
            <IconSparkles className="size-4" />
            Aurora SkinSense
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">{copy.title}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.description}</p>

          <div className="mt-8">
            {currentStep === "intro" ? <IntroStep /> : null}
            {currentStep === "capture" ? (
              <CaptureStep
                videoRef={videoRef}
                canvasRef={canvasRef}
                fileInputRef={fileInputRef}
                cameraError={cameraError}
                isCameraActive={isCameraActive}
                onStartCamera={() => void startCamera()}
                onCapture={captureImage}
                onUpload={uploadImage}
              />
            ) : null}
            {currentStep === "review" && selectedImage ? (
              <ReviewStep
                selectedImage={selectedImage}
                inputMethod={inputMethod}
                onRetake={retakeImage}
                onRemove={removeImage}
              />
            ) : null}
            {currentStep === "processing" ? (
              <ProcessingStep analysisError={analysisError} isAnalyzing={isAnalyzing} />
            ) : null}
            {currentStep === "results" ? <ResultsStep analysis={analysisResult} /> : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {currentStep !== "intro" ? (
              <Button type="button" variant="outline" onClick={goBack} disabled={isAnalyzing}>
                <IconChevronLeft className="size-4" />
                Back
              </Button>
            ) : null}
            {currentStep === "results" ? (
              <>
                <Button type="button" onClick={restart}>
                  Start New Scan
                </Button>
                <Button type="button" variant="outline">
                  <IconDownload className="size-4" />
                  Download PDF
                </Button>
              </>
            ) : currentStep === "capture" ? null : (
              <Button
                type="button"
                onClick={() => void goNext()}
                disabled={
                  (currentStep === "review" && !selectedImage) ||
                  (currentStep === "processing" && (isAnalyzing || !analysisResult))
                }
              >
                {currentStep === "intro"
                  ? "I Consent, Begin Scan"
                  : currentStep === "processing"
                    ? isAnalyzing
                      ? "Analyzing..."
                      : "View Results"
                    : "Continue to Processing"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <ScanPreview currentStep={currentStep} selectedImage={selectedImage} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <IconFileAnalytics className="size-6 text-primary" />
              <p className="mt-3 text-sm font-medium">Cosmetic skin report</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Visible texture, tone, hydration appearance, and Aurora recommendations.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <IconReportAnalytics className="size-6 text-primary" />
              <p className="mt-3 text-sm font-medium">Privacy-first input</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Camera and upload images remain in local browser state in this Phase 1 UI.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const type = blob.type || "image/jpeg"

  return new File([blob], ensureImageExtension(fileName, type), { type })
}

async function requestCameraStream() {
  const preferredConstraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "user" },
      height: { ideal: 960 },
      width: { ideal: 1280 },
    },
  }

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints)
  } catch (error) {
    if (!shouldRetryWithBasicCamera(error)) {
      throw error
    }

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
  }
}

function shouldRetryWithBasicCamera(error: unknown) {
  if (!(error instanceof DOMException)) return true

  return (
    error.name === "OverconstrainedError" ||
    error.name === "ConstraintNotSatisfiedError" ||
    error.name === "NotFoundError" ||
    error.name === "NotReadableError"
  )
}

function getCameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) {
    return "Camera could not be started. Please try again or upload an image instead."
  }

  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Camera permission is blocked. Allow camera access in your browser settings, then try again."
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No camera was found. Connect a camera or upload an image instead."
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Your camera is already in use by another app or browser tab. Close it, then try again."
  }

  if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
    return "This camera does not support the preferred scan settings. Please try again or upload an image."
  }

  return "Camera could not be started. Please try again or upload an image instead."
}

function ensureImageExtension(fileName: string, mimeType: string) {
  if (/\.(jpe?g|png|webp)$/i.test(fileName)) return fileName

  if (mimeType === "image/png") return `${fileName}.png`
  if (mimeType === "image/webp") return `${fileName}.webp`
  return `${fileName}.jpg`
}
