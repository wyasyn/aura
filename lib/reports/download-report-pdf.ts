import { toast } from "sonner"

type DownloadReportPdfOptions = {
  onStart?: () => void
  onFinish?: () => void
}

export async function downloadReportPdf(
  scanId: string,
  options?: DownloadReportPdfOptions,
): Promise<boolean> {
  options?.onStart?.()

  try {
    const response = await fetch(`/api/reports/${scanId}/pdf`, {
      credentials: "include",
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(body?.error ?? "Could not download PDF")
      return false
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `aura-skin-report-${scanId}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    toast.success("PDF downloaded")
    return true
  } catch {
    toast.error("Could not download PDF")
    return false
  } finally {
    options?.onFinish?.()
  }
}
