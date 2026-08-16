"use client"

import type { ReactNode } from "react"
import { IconCrop, IconFileText, IconRefresh } from "@tabler/icons-react"

import { ScanFlowHeader } from "@/components/scan/scan-flow-header"
import { ScanImagePanel } from "@/components/scan/scan-image-panel"
import {
  ScanSegmentButton,
  ScanSegmentGroup,
} from "@/components/scan/scan-segment-controls"
import { cn } from "@/lib/utils"

type ScanReportLayoutProps = {
  imageSrc?: string | null
  imageLoading?: boolean
  imageLoadingLabel?: string
  imageOverlay?: ReactNode
  /** Rendered directly under the photo in the left column. */
  imageFooter?: ReactNode
  children: ReactNode
  onRescan?: () => void
  onReEdit?: () => void
  onViewReport?: () => void
  showActions?: boolean
  className?: string
}

export function ScanReportLayout({
  imageSrc,
  imageLoading = false,
  imageLoadingLabel,
  imageOverlay,
  imageFooter,
  children,
  onRescan,
  onReEdit,
  onViewReport,
  showActions = true,
  className,
}: ScanReportLayoutProps) {
  const showImageColumn = Boolean(imageSrc) || imageLoading

  return (
    <div className={cn("mx-auto w-full max-w-5xl space-y-8", className)}>
      {showActions ? (
        <ScanFlowHeader
          className="max-w-5xl"
          trailing={
            <ScanSegmentGroup>
              {onReEdit ? (
                <ScanSegmentButton
                  aria-label="Adjust crop"
                  onClick={onReEdit}
                >
                  <IconCrop className="size-3.5" />
                  <span className="hidden sm:inline">Adjust crop</span>
                </ScanSegmentButton>
              ) : null}
              {onRescan ? (
                <ScanSegmentButton aria-label="Rescan" onClick={onRescan}>
                  <IconRefresh className="size-3.5" />
                  <span className="hidden sm:inline">Rescan</span>
                </ScanSegmentButton>
              ) : null}
              {onViewReport ? (
                <ScanSegmentButton
                  aria-label="View report"
                  active
                  onClick={onViewReport}
                >
                  <IconFileText className="size-3.5" />
                  <span className="hidden sm:inline">View report</span>
                </ScanSegmentButton>
              ) : null}
            </ScanSegmentGroup>
          }
        />
      ) : null}

      <div
        className={cn(
          "grid w-full items-start gap-6 pt-2 sm:pt-4",
          showImageColumn &&
            "justify-items-center lg:grid-cols-[minmax(0,280px)_1fr] lg:justify-items-stretch lg:gap-8",
        )}
      >
        {showImageColumn ? (
          <div className="mx-auto w-full max-w-[280px] space-y-3 self-start lg:sticky lg:top-8 lg:mx-0">
            <ScanImagePanel
              imageSrc={imageSrc}
              isLoading={imageLoading}
              loadingLabel={imageLoadingLabel}
              overlay={imageOverlay}
              compact
            />
            {imageFooter}
          </div>
        ) : null}
        <div className="mx-auto min-w-0 w-full max-w-2xl self-start lg:mx-0 lg:max-w-none">
          {children}
        </div>
      </div>
    </div>
  )
}
