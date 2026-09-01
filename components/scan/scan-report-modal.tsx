"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { ReportDocumentHeader } from "@/components/reports/report-document-header"
import { SkinReportDocument } from "@/components/reports/skin-report-document"
import { ScanReportFooter } from "@/components/scan/scan-report-footer"
import { ScanReportLayout } from "@/components/scan/scan-report-layout"
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
import { downloadReportPdf } from "@/lib/reports/download-report-pdf"
import type { ScanClimateContext, SkinAssessment } from "@/lib/scan/types"
import { deleteScanAction } from "@/lib/user/data-actions"
import { cn } from "@/lib/utils"

type ScanReportModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment: SkinAssessment
  climateContext?: ScanClimateContext | null
  imageSrc?: string | null
  scanId?: string | null
  scanDate?: string
}

export function ScanReportModal({
  open,
  onOpenChange,
  assessment,
  climateContext = null,
  imageSrc,
  scanId,
  scanDate,
}: ScanReportModalProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  async function handleDelete() {
    if (!scanId) return
    setDeleting(true)
    try {
      await deleteScanAction(scanId)
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
        description={formattedDate}
        className="sm:max-w-5xl"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <ScanReportLayout imageSrc={imageSrc} showActions={false}>
              <div className="mx-auto max-w-5xl space-y-6">
                <ReportDocumentHeader scanDate={formattedDate} />
                <SkinReportDocument
                  assessment={assessment}
                  climateContext={climateContext}
                  scanId={scanId}
                />
              </div>
            </ScanReportLayout>
          </div>

          {scanId ? (
            <ScanReportFooter
              scanId={scanId}
              downloading={downloading}
              deleting={deleting}
              onDownloadPdf={() => void handleDownloadPdf()}
              onDelete={() => setDeleteOpen(true)}
            />
          ) : null}
        </div>
      </ResponsiveDialog>

      {scanId ? (
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
      ) : null}
    </>
  )
}
