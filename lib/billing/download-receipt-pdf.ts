import { toast } from "sonner"

type DownloadReceiptPdfOptions = {
  onStart?: () => void
  onFinish?: () => void
}

export async function downloadReceiptPdf(
  paymentId: string,
  receiptNumber: string,
  options?: DownloadReceiptPdfOptions,
): Promise<boolean> {
  options?.onStart?.()

  try {
    const response = await fetch(`/api/billing/receipt/${paymentId}`, {
      credentials: "include",
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(body?.error ?? "Could not download receipt")
      return false
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `aura-receipt-${receiptNumber}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    toast.success("Receipt downloaded")
    return true
  } catch {
    toast.error("Could not download receipt")
    return false
  } finally {
    options?.onFinish?.()
  }
}
