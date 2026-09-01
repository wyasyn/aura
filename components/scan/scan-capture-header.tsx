"use client"

import type { ReactNode } from "react"
import { IconCamera, IconSparkles, IconUpload, IconVideo } from "@tabler/icons-react"

import { TabsList, TabsTrigger } from "@/components/motion/tabs"
import { CaptureTabTooltip } from "@/components/scan/capture-tab-tooltip"
import { ScanFlowHeader } from "@/components/scan/scan-flow-header"
import { CAPTURE_TAB_TOOLTIPS } from "@/lib/scan/capture-copy"

type ScanCaptureHeaderProps = {
  trailingActions?: ReactNode
  showLiveTab?: boolean
}

export function ScanCaptureHeader({
  trailingActions,
  showLiveTab = false,
}: ScanCaptureHeaderProps) {
  return (
    <ScanFlowHeader
      trailing={
        <>
          <TabsList className="w-fit border border-border">
            <CaptureTabTooltip label={CAPTURE_TAB_TOOLTIPS.upload}>
              <TabsTrigger value="upload" className="gap-1.5 px-3">
                <IconUpload className="size-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
            </CaptureTabTooltip>
            <CaptureTabTooltip label={CAPTURE_TAB_TOOLTIPS.camera}>
              <TabsTrigger value="camera" className="gap-1.5 px-3">
                <IconCamera className="size-3.5" />
                <span className="hidden sm:inline">Camera</span>
              </TabsTrigger>
            </CaptureTabTooltip>
            {showLiveTab ? (
              <CaptureTabTooltip label="Real-time Pro live skin scan">
                <TabsTrigger value="live" className="gap-1.5 px-3">
                  <IconVideo className="size-3.5" />
                  <span className="hidden sm:inline">Live</span>
                </TabsTrigger>
              </CaptureTabTooltip>
            ) : null}
            <CaptureTabTooltip label={CAPTURE_TAB_TOOLTIPS.advice}>
              <TabsTrigger value="advice" className="gap-1.5 px-3">
                <IconSparkles className="size-3.5" />
                <span className="hidden sm:inline">Advice</span>
              </TabsTrigger>
            </CaptureTabTooltip>
          </TabsList>
          {trailingActions}
        </>
      }
    />
  )
}
