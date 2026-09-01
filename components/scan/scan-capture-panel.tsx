"use client"

import { useEffect, useState } from "react"

import { Tabs, TabsContent } from "@/components/motion/tabs"
import { ScanCameraHints } from "@/components/scan/scan-camera-hints"
import { ScanCameraView } from "@/components/scan/scan-camera-view"
import { ScanCaptureHeader } from "@/components/scan/scan-capture-header"
import { ScanCaptureAdvicePanel } from "@/components/scan/scan-capture-advice-panel"
import { ScanLivePanel } from "@/components/scan/scan-live-panel"
import { ScanStepShell } from "@/components/scan/scan-step-shell"
import { ScanUploadPanel } from "@/components/scan/scan-upload-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type {
  CaptureMode,
  LiveScanPayload,
  ScanTier,
} from "@/lib/scan/types"
import { CAPTURE_COPY } from "@/lib/scan/capture-copy"

type ScanCapturePanelProps = {
  mode: CaptureMode
  scanTier: ScanTier
  onModeChange: (mode: CaptureMode) => void
  onImageSelected: (file: File, previewUrl: string, source: CaptureMode) => void
  onLiveComplete: (result: {
    transcript: string
    bestFrameBlob: Blob
    previewUrl: string
    sessionDurationMs: number
    sessionUsage: LiveScanPayload["sessionUsage"]
  }) => void
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

export function ScanCapturePanel({
  mode,
  scanTier,
  onModeChange,
  onImageSelected,
  onLiveComplete,
}: ScanCapturePanelProps) {
  const isMobile = useIsMobile()
  const activeMode = mode === "advice" ? "advice" : mode === "live" ? "live" : mode
  const copy = CAPTURE_COPY[activeMode]
  const canUseLiveScan = scanTier === "pro"

  if (isMobile && mode === "camera") {
    return (
      <>
        <ScanCameraView
          fullscreen
          onCapture={(file, previewUrl) =>
            onImageSelected(file, previewUrl, "camera")
          }
          onSwitchToUpload={() => onModeChange("upload")}
        />
        <ScanCameraHints placement="fullscreen" />
      </>
    )
  }

  if (mode === "live") {
    if (!canUseLiveScan) {
      return (
        <ScanStepShell
          title={copy.title}
          description="Live scan is available on the Pro tier."
        >
          <Alert>
            <AlertTitle>Pro feature</AlertTitle>
            <AlertDescription>
              Upgrade to Pro to use real-time live skin guidance. You can still
              scan with upload or camera.
            </AlertDescription>
          </Alert>
        </ScanStepShell>
      )
    }

    return (
      <ScanStepShell title={copy.title} description={copy.description}>
        <ScanLivePanel
          onComplete={onLiveComplete}
          onCancel={() => onModeChange("upload")}
        />
      </ScanStepShell>
    )
  }

  const showHints = activeMode === "upload" || activeMode === "camera"

  return (
    <div className="flex w-full flex-col items-center overflow-visible">
      <Tabs
        value={activeMode}
        onValueChange={(value) => onModeChange(value as CaptureMode)}
        variant="segment"
        roundedSegment
        className="relative flex w-full max-w-2xl flex-col items-center overflow-visible"
      >
        <ScanCaptureHeader showLiveTab={canUseLiveScan} />

        {activeMode === "advice" ? (
          mode === "advice" ? <ScanCaptureAdvicePanel /> : null
        ) : (
          <ScanStepShell title={copy.title} description={copy.description}>
            <TabsContent value="upload" className="mt-0">
              <ScanUploadPanel onImageSelected={onImageSelected} />
            </TabsContent>
            <TabsContent value="camera" className="mt-0">
              {mode === "camera" ? (
                <ScanCameraView
                  onCapture={(file, previewUrl) =>
                    onImageSelected(file, previewUrl, "camera")
                  }
                />
              ) : null}
            </TabsContent>
          </ScanStepShell>
        )}

        {/* Docked beside the card on xl+, aligned with the tab row. */}
        {showHints ? <ScanCameraHints placement="section" /> : null}
        {showHints ? (
          <ScanCameraHints placement="inline" className="mt-3" />
        ) : null}
      </Tabs>
    </div>
  )
}
