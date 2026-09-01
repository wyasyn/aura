"use client"

import {
  IconDownload,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react"

import {
  ScanReportChatDock,
} from "@/components/scan/scan-report-chat-dock"
import type { ScanFeedbackRecord } from "@/components/scan/scan-feedback-widget"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ScanReportFooterProps = {
  scanId: string
  existingFeedback?: ScanFeedbackRecord | null
  downloading?: boolean
  deleting?: boolean
  showDelete?: boolean
  onDownloadPdf: () => void
  onDelete?: () => void
  className?: string
}

export function ScanReportFooter({
  scanId,
  existingFeedback = null,
  downloading = false,
  deleting = false,
  showDelete = true,
  onDownloadPdf,
  onDelete,
  className,
}: ScanReportFooterProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showDelete && onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={deleting}
            onClick={onDelete}
          >
            <IconTrash className="size-3.5" />
            Delete scan
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={downloading}
          onClick={onDownloadPdf}
        >
          {downloading ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconDownload className="size-3.5" />
          )}
          {downloading ? "Generating…" : "Download PDF"}
        </Button>
      </div>

      <ScanReportChatDock
        scanId={scanId}
        existingFeedback={existingFeedback}
        variant="footer"
      />
    </div>
  )
}
