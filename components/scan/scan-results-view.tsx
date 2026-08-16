"use client"

import { useState } from "react"
import { IconDownload, IconLoader2 } from "@tabler/icons-react"

import { ReportDocumentHeader } from "@/components/reports/report-document-header"
import { SkinReportDocument } from "@/components/reports/skin-report-document"
import { ScanReportChatDock } from "@/components/scan/scan-report-chat-dock"
import { ScanDashboardLink } from "@/components/scan/scan-close-button"
import { ScanReportLayout } from "@/components/scan/scan-report-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { downloadReportPdf } from "@/lib/reports/download-report-pdf"
import type { ScanClimateContext, SkinAssessment } from "@/lib/scan/types"

type ScanResultsViewProps = {
  assessment: SkinAssessment
  climateContext?: ScanClimateContext | null
  imageSrc: string
  scanId: string | null
  onNewScan: () => void
  onReEdit: () => void
  onViewReport: () => void
  scanDate?: string
}

export function ScanResultsView({
  assessment,
  climateContext = null,
  imageSrc,
  scanId,
  onNewScan,
  onReEdit,
  onViewReport,
  scanDate,
}: ScanResultsViewProps) {
  const [downloading, setDownloading] = useState(false)

  const formattedDate =
    scanDate ??
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  async function handleDownloadPdf() {
    if (!scanId) return
    setDownloading(true)
    await downloadReportPdf(scanId, {
      onFinish: () => setDownloading(false),
    })
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <ScanReportLayout
        imageSrc={imageSrc}
        onRescan={onNewScan}
        onReEdit={onReEdit}
        onViewReport={onViewReport}
        imageFooter={
          scanId ? (
            <ScanReportChatDock
              scanId={scanId}
              variant="footer"
              className="w-full flex-col items-stretch"
            />
          ) : null
        }
      >
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
          <ReportDocumentHeader scanDate={formattedDate} />

          <Alert className="rounded-none">
            <AlertDescription>
              Your photo is shown only for this session. It is not stored or
              included in saved reports or PDFs.
            </AlertDescription>
          </Alert>

          <div className="rounded-none border border-border bg-background/75 p-4 backdrop-blur-sm sm:p-6">
            <SkinReportDocument
              assessment={assessment}
              climateContext={climateContext}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <ScanDashboardLink />
            {scanId ? (
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={downloading}
                onClick={handleDownloadPdf}
              >
                {downloading ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconDownload className="size-3.5" />
                )}
                {downloading ? "Generating…" : "Download PDF"}
              </Button>
            ) : null}
          </div>
        </div>
      </ScanReportLayout>
    </div>
  )
}
