"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { ReportDocumentHeader } from "@/components/reports/report-document-header"
import { SkinReportDocument } from "@/components/reports/skin-report-document"
import { ScanReportFooter } from "@/components/scan/scan-report-footer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { parseLocationSnapshot } from "@/lib/climate/snapshot"
import { downloadReportPdf } from "@/lib/reports/download-report-pdf"
import { fromScanResult } from "@/lib/scan/persist"
import type { ScanClimateContext, SkinAssessment } from "@/lib/scan/types"
import { deleteScanAction } from "@/lib/user/data-actions"
import { cn } from "@/lib/utils"

import type { ReportListItem } from "./reports-list-client"

type ScanDetailModalProps = {
  scan: ReportListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScanDetailModal({
  scan,
  open,
  onOpenChange,
}: ScanDetailModalProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!scan?.result) return null

  const assessment: SkinAssessment = fromScanResult({
    overallBand: scan.result.overallBand as SkinAssessment["overallBand"],
    dimensions: scan.result.dimensions as Parameters<
      typeof fromScanResult
    >[0]["dimensions"],
    doshaTyping: scan.result.doshaTyping as Parameters<
      typeof fromScanResult
    >[0]["doshaTyping"],
    summary: scan.result.summary,
    concernsNotVisible: scan.result.concernsNotVisible as Parameters<
      typeof fromScanResult
    >[0]["concernsNotVisible"],
    naturalRecommendations: scan.result.naturalRecommendations as Parameters<
      typeof fromScanResult
    >[0]["naturalRecommendations"],
    recommendations: scan.result.recommendations as Parameters<
      typeof fromScanResult
    >[0]["recommendations"],
    disclaimerVersion: scan.result.disclaimerVersion,
  })

  const climateContext: ScanClimateContext | null = parseLocationSnapshot(
    scan.locationSnapshot,
  )

  const scanDate = new Date(scan.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  async function handleDownloadPdf() {
    setDownloading(true)
    await downloadReportPdf(scan!.id, {
      onFinish: () => setDownloading(false),
    })
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteScanAction(scan!.id)
      setDeleteOpen(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Skin report"
        description={scanDate}
        className="sm:max-w-5xl"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <ReportDocumentHeader
                scanDate={scanDate}
                captureMode={scan.captureMode}
              />

              <SkinReportDocument
                assessment={assessment}
                climateContext={climateContext}
                scanId={scan.id}
              />
            </div>
          </div>

          <ScanReportFooter
            scanId={scan.id}
            existingFeedback={scan.feedback}
            downloading={downloading}
            deleting={deleting}
            onDownloadPdf={() => void handleDownloadPdf()}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </ResponsiveDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the scan result, usage record, and report metadata.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? "Deleting…" : "Delete scan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
