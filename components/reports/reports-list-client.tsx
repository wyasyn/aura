"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  IconDownload,
  IconFileText,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react"

import { ScanDetailModal } from "@/components/reports/scan-detail-modal"
import { ReportsPagination } from "@/components/reports/reports-pagination"
import { BandBadge } from "@/components/scan/band-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { downloadReportPdf } from "@/lib/reports/download-report-pdf"
import type { SkinAssessment } from "@/lib/scan/types"
import {
  deleteAllScansAction,
} from "@/lib/user/data-actions"
import { cn } from "@/lib/utils"

export type ReportListItem = {
  id: string
  createdAt: string
  status: string
  captureMode: string
  locationSnapshot: unknown
  scansDebited: number | null
  result: {
    overallBand: string
    dimensions: unknown
    doshaTyping: unknown
    summary: string | null
    concernsNotVisible: unknown
    naturalRecommendations: unknown
    recommendations: unknown
    disclaimerVersion: string
  } | null
  feedback: {
    rating: number
    message: string | null
  } | null
}

type ReportsListClientProps = {
  scans: ReportListItem[]
  page: number
  totalPages: number
  totalCount: number
}

export function ReportsListClient({
  scans,
  page,
  totalPages,
  totalCount,
}: ReportsListClientProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ReportListItem | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openReport(scan: ReportListItem) {
    if (!scan.result) return
    setSelected(scan)
    setOpen(true)
  }

  async function handleDownloadPdf(scanId: string) {
    setDownloadingId(scanId)
    await downloadReportPdf(scanId, {
      onFinish: () => setDownloadingId(null),
    })
  }

  async function handleClearAllReports() {
    setClearingAll(true)
    setError(null)
    try {
      await deleteAllScansAction()
      setOpen(false)
      setSelected(null)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not clear all reports.",
      )
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} report{totalCount === 1 ? "" : "s"}
        </p>
        {totalCount > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={clearingAll}
              >
                {clearingAll ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconTrash className="size-3.5" />
                )}
                Clear all reports
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all reports?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes every scan, report, and follow-up
                  chat linked to those scans. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleClearAllReports()}>
                  Clear all reports
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {scans.map((scan) => {
          const isDownloading = downloadingId === scan.id

          return (
            <article
              key={scan.id}
              className={cn(
                "@container surface-panel rounded-xl border border-border/60 p-5 transition-colors",
                scan.result && "cursor-pointer hover:bg-muted/30",
              )}
              onClick={() => scan.result && openReport(scan)}
              onKeyDown={(event) => {
                if (
                  scan.result &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault()
                  openReport(scan)
                }
              }}
              role={scan.result ? "button" : undefined}
              tabIndex={scan.result ? 0 : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {scan.result?.overallBand ? (
                      <BandBadge
                        band={
                          scan.result
                            .overallBand as SkinAssessment["overallBand"]
                        }
                        size="sm"
                        variant="chip"
                      />
                    ) : (
                      <h2 className="font-heading text-lg font-medium capitalize">
                        {scan.status}
                      </h2>
                    )}
                    <Badge variant="secondary" className="font-normal capitalize">
                      {scan.captureMode}
                    </Badge>
                  </div>
                  {scan.result?.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {scan.result.summary}
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-sm">
                  {scan.scansDebited != null ? (
                    <>
                      <p className="text-muted-foreground">Scans</p>
                      <p className="font-medium tabular-nums">
                        {scan.scansDebited.toLocaleString()}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>

              {scan.result ? (
                <div
                  className="mt-4 grid grid-cols-1 gap-2 @min-[18rem]:grid-cols-2"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openReport(scan)}
                  >
                    <IconFileText className="size-3.5" />
                    View details
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={isDownloading}
                    onClick={() => handleDownloadPdf(scan.id)}
                  >
                    {isDownloading ? (
                      <IconLoader2 className="size-3.5 animate-spin" />
                    ) : (
                      <IconDownload className="size-3.5" />
                    )}
                    {isDownloading ? "Generating…" : "Download PDF"}
                  </Button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <ReportsPagination page={page} totalPages={totalPages} className="mt-6" />

      <ScanDetailModal scan={selected} open={open} onOpenChange={setOpen} />
    </>
  )
}
